##   RSence
 #   Copyright 2006 Riassence Inc.
 #   http://riassence.com/
 #
 #   You should have received a copy of the GNU General Public License along
 #   with this software package. If not, contact licensing@riassence.com
 ##
require 'plugins/plugins'

module RSence
  
  ## = Abstract
  ## PluginManager is the service that loads and provides method delegation
  ## amongst its plugin bundles.
  ##
  ## = Usage
  ## plugin_paths = [ 'plugins', '/home/me/rsence/plugins' ]
  ## myPluginManager = RSence::PluginManager.new( plugin_paths )
  ##
  class PluginManager
    
    attr_reader :transporter, :sessions
    
    # Initialize with a list of directories as plugin_paths.
    # It's an array containing all plugin directories to scan.
    def initialize( plugin_paths, transporter=nil, autoreload=false, name_prefix=false )
      if transporter
        @transporter = transporter
        @sessions = transporter.sessions
      end
      @name_prefix = name_prefix
      @plugin_paths = plugin_paths
      puts "Loading #{name_prefix+' ' if name_prefix}plugins..." if RSence.args[:verbose]
      scan_plugins
      puts "Plugins #{name_prefix+' ' if name_prefix}loaded." if RSence.args[:verbose]
      if autoreload
        @thr = Thread.new do
          Thread.pass
          while true
            begin
              changed_plugins!
            rescue => e
              warn e.inspect
            end
            sleep 3
          end
        end
      end
    end
    
    # By default, calling a method not defined calls a plugin of that name
    def method_missing( sym, *args, &block )
      if @registry.has_key?(sym)
        if args == [] and block == nil
          return @registry[sym]
        elsif block == nil
          call( sym, *args )
        end
      end
    end
    
    # Checks for changed plugin bundles and unloads/loads/reloads them accordingly.
    def changed_plugins!
      @plugin_paths.each do |path|
        next unless File.directory? path
        Dir.entries(path).each do |bundle_name|
          next if bundle_name =~ /&\./
          bundle_path = File.expand_path( File.join( path, bundle_name ) )
          next unless File.directory?( bundle_path )
          bundle_file = bundle_name+'.rb'
          next unless File.exists?( File.join( bundle_path, bundle_file ) )
          if File.exists?( File.join( bundle_path, 'disabled' ) )
            if @registry.has_key?( bundle_name.to_sym )
              puts "Disabling bundle #{bundle_name}..."
              online_status = @transporter.online?
              @transporter.online = false
              unload_bundle( bundle_name.to_sym )
              @transporter.online = online_status
              if RSence.args[:say]
                Thread.new do
                  Thread.pass
                  system(%{say "Unloaded #{bundle_name.to_s}."})
                end
              end
            end
          else
            if not @registry.has_key?( bundle_name.to_sym )
              puts "Loading bundle #{bundle_name}..."
              online_status = @transporter.online?
              @transporter.online = false
              load_bundle( bundle_path, bundle_name.to_sym, bundle_name+'.rb' )
              call( bundle_name.to_sym, :open )
              @transporter.online = online_status
              if RSence.args[:say]
                Thread.new do
                  Thread.pass
                  system(%{say "Loaded #{bundle_name.to_s}."})
                end
              end
            else
              # puts "Checking if bundle #{bundle_name} is changed..."
              info = @info[bundle_name.to_sym]
              if info[:reloadable] and plugin_changed?( bundle_name.to_sym )
                puts "Bundle #{bundle_name} has changed, reloading..."
                online_status = @transporter.online?
                @transporter.online = false
                unload_bundle( bundle_name.to_sym )
                load_bundle( bundle_path, bundle_name.to_sym, bundle_name+'.rb' )
                call( bundle_name.to_sym, :open )
                @transporter.online = online_status
                if RSence.args[:say]
                  Thread.new do
                    Thread.pass
                    system(%{say "Reloaded #{bundle_name.to_s}."})
                  end
                end
              end
            end
          end
        end
      end
    end
    
    # Unloads the plugin bundle named +bundle_name+
    def unload_bundle( bundle_name )
      puts "unloading bundle: #{bundle_name.inspect}" if RSence.args[:debug]
      if @registry.has_key?( bundle_name )
        call( bundle_name, :flush )
        call( bundle_name, :close )
        @registry.delete( bundle_name )
        @aliases.each do |a_name,b_name|
          if b_name == bundle_name
            @aliases.delete( a_name )
          end
        end
        if @servlets.include?( bundle_name )
          @servlets.delete( bundle_name )
        end
        if @info.include?( bundle_name )
          @info.delete( bundle_name )
        end
      end
    end
    
    # Returns true, if a plugin bundle has changed.
    # Only compares timestamp, not checksum.
    def plugin_changed?( plugin_name )
      info = @info[plugin_name]
      last_changed = info[:last_changed]
      newest_change = most_recent( info[:path], last_changed )
      return last_changed < newest_change
    end
  
    # Top-level method for scanning all plugin directories.
    # Clears previously loaded plugins.
    def scan_plugins
      @registry = {}
      @info     = {}
      @aliases  = {}
      @servlets = []
      @plugin_paths.each do |path|
        next unless File.directory? path
        scan_plugindir( path )
      end
      delegate( :open )
    end
    
    # Returns the registry data for plugin bundle +plugin_name+
    def registry( plugin_name )
      return @registry[ plugin_name ]
    end
    alias [] registry
    
    # Scans a directory of plugins, calls +load_plugin+ for bundles that match
    # the definition of a plugin bundle.
    #  - Skips bundles starting with a dot
    #  - Skips bundles without a ruby source file with the same
    #    name as the directory (plus '.rb').
    #  - Skips bundles containing a file or directory named 'disabled'
    def scan_plugindir( path )
      Dir.entries(path).each do |bundle_name|
        next if bundle_name[0].chr == '.'
        bundle_path = File.expand_path( File.join( path, bundle_name ) )
        next unless File.directory?( bundle_path )
        bundle_file = bundle_name+'.rb'
        if not File.exists?( File.join( bundle_path, bundle_file ) )
          bundle_file = 'main.rb'
          next unless File.exists?( File.join( bundle_path, bundle_file ) )
        end
        next if File.exists?( File.join( bundle_path, 'disabled' ) )
      
        load_bundle( bundle_path, bundle_name.to_sym, bundle_file )
      end
    end
  
    # Finds the most recent file in the path
    def most_recent( bundle_path, newest_date=0 )
      path_date = File.stat( bundle_path ).mtime.to_i
      is_dir = File.directory?( bundle_path )
      if path_date > newest_date and not is_dir
        # puts "File is newer: #{bundle_path}"
        newest_date = path_date
      end
      if is_dir
        Dir.entries( bundle_path ).each do |entry_name|
          next if entry_name[0].chr == '.'
          full_path = File.join( bundle_path, entry_name )
          unless File.directory?( full_path )
            next unless entry_name.include?('.') and ['yaml','rb'].include?( entry_name.split('.')[-1] )
          end
          newest_date = most_recent( full_path, newest_date )
        end
      end
      return newest_date
    end
  
    # Gets plugin information
    def bundle_info( bundle_path )
    
      bundle_name = File.split( bundle_path )[1]
    
      # Default bundle information
      info = {
        # The human-readable product name of the package
        :title => bundle_name.capitalize,
      
        # The human-readable version of the package
        :version => '0.0.0',
      
        # A brief description of the package (rdoc formatting supported)
        :description => 'No Description',
      
        # A flag (when false) prevents the plugin from automatically reload when changed.
        :reloadable => true,
      
        # System version requirement.
        :sys_version => '>= 1.0.0',
      
        # Path to bundle
        :path => bundle_path,
      
        # Name of bundle
        :name => bundle_name.to_sym,
      
        # Last change
        :last_changed => most_recent( bundle_path  )
      
      }
    
      info_path = File.join( bundle_path, 'info.yaml' )
      if File.exists?( info_path )
        info_yaml = YAML.load( File.read( info_path ) )
        info_yaml.each do |info_key,info_value|
          info[ info_key.to_sym ] = info_value
        end
      end
      return info
    
    end
  
    # Loads a plugin bundle.
    def load_bundle( bundle_path, bundle_name, bundle_file )
      puts "loading bundle: #{bundle_name.inspect}" if RSence.args[:debug]
      if @registry.has_key?( bundle_name.to_sym )
        warn "Warning: Bundle #{bundle_name} already loaded."
        return
      end
    
      bundle_file_path = File.join( bundle_path, bundle_file )
    
      bundle_info = bundle_info( bundle_path )
    
      @info[bundle_name.to_sym] = bundle_info
    
      bundle_src = File.read( bundle_file_path )
    
      module_ns         = Plugins.bundle_loader( {
        :bundle_path    => bundle_path,
        :bundle_name    => bundle_name,
        :bundle_info    => bundle_info,
        :plugin_manager => self,
        :src_path       => bundle_file_path,
        :src            => bundle_src
      } )
    
      module_ns.constants.each do |module_const_name|
        module_const = module_ns.const_get( module_const_name )
        if module_const.class == Class
          bundle_type = module_const.bundle_type
          if [:Servlet, :Plugin, :GUIPlugin].include? bundle_type
            bundle_inst = module_const.new( bundle_name, bundle_info, bundle_path, self )
            bundle_inst.register( bundle_name ) if [ :Plugin, :GUIPlugin ].include?( bundle_type )
            break
          else
            warn "Can't init class: #{module_const.to_s}"
            break
          end
        else
          warn "Invalid module_const.class: #{module_const.class.inspect}"
        end
      end
    end
    
    # Registers plugin class +inst+ into the registry using +bundle_name+
    def register_bundle( inst, bundle_name )
      bundle_name = bundle_name.to_sym
      if @registry.has_key?( bundle_name )
        if registry[ bundle_name ] != inst
          warn "Tried to register a conflicting bundle name: #{bundle_name.inspect}; ignoring"
        else
          warn "Use @plugins.register_alias to register more than one name per plugin."
          register_alias( inst.name.to_sym, bundle_name )
        end
      else
        inst.init if inst.respond_to? :init and not inst.inited
        @registry[ bundle_name ] = inst
        if inst.respond_to?( :match ) and ( inst.respond_to?( :get ) or inst.respond_to?( :post ) )
          puts " --- servlet: #{bundle_name.inspect}, #{inst.respond_to?(:match)}, #{inst.post}" if bundle_name == :welcome
          @servlets.push( bundle_name )
        end
      end
    end
    
    # Registers alias name for a plugin bundle.
    def register_alias( bundle_name, alias_name )
      if @aliases.has_key?( alias_name.to_sym )
        warn "Alias already taken: #{alias_name.inspect}"
      else
        @aliases[ alias_name ] = bundle_name.to_sym
      end
    end
    
    # Prettier error handling.
    def plugin_error( e, err_location, err_location_descr, eval_repl=false )
      err_msg = [
        "*"*40,
        err_location,
        err_location_descr,
        "#{e.class.to_s}, #{e.message}",
        "Backtrace:",
        "\t"+e.backtrace.join("\n\t"),
        "*"*40
      ].join("\n")+"\n"
      if eval_repl
        puts
        puts "plugin: #{eval_repl}"
        puts
        err_msg = err_msg.gsub(/^\t\(eval\)\:/s,"\t#{eval_repl}:")
      end
      $stderr.write( err_msg )
    end
    
    # Search servlets that match the +uri+ and +req_type+
    def match_servlet_uri( uri, req_type=:get )
      match_score = {}
      @servlets.each do | servlet_name |
        servlet = @registry[ servlet_name ]
        next unless servlet.respond_to?( req_type )
        begin
          if servlet.match( uri, req_type )
            score = servlet.score
            match_score[ score ] = [] unless match_score.has_key? score
            match_score[ score ].push( servlet_name )
          end
        rescue => e
          plugin_error(
            e,
            "RSence::PluginManager.match_servlet_uri",
            "servlet: #{servlet_name.inspect}, req_type: #{req_type.inspect}, uri: #{uri.inspect}",
            servlet_name
          )
        end
      end
      match_scores = match_score.keys.sort
      if match_scores.empty?
        return false
      else
        matches_order = []
        matches_best  = match_score[ match_scores[0] ]
        if matches_best.size > 1
          matches_best = matches_best[ rand( matches_best.size ) ]
        else
          matches_best = matches_best.first
        end
        matches_order.push( matches_best )
        match_score.keys.sort.each do |match_n|
          match_score[ match_n ].each do | match_name |
            matches_order.push( match_name ) unless matches_order.include? match_name
          end
        end
        return matches_order
      end
    end
    
    # Delegates +method_name+ with +args+ to any loaded
    # plugin that responds to the method.
    def delegate( method_name, *args )
      @registry.each do | plugin_name, plugin |
        if plugin.respond_to?( method_name )
          begin
            plugin.send( method_name, *args  )
          rescue => e
            plugin_error(
              e,
              "RSence::PluginManager.delegate error",
              "plugin_name: #{plugin_name.inspect}, method_name: #{method_name.inspect}",
              plugin_name
            )
          end
        end
      end
    end
    
    # Delegates the +flush+ and +close+ methods to any
    # loaded plugins, in that order.
    def shutdown
      delegate( :flush )
      delegate( :close )
    end
    
    # Calls the method +method_name+ with args +args+ of the plugin +plugin_name+.
    # Returns false, if no such plugin or method exists.
    def call( plugin_name, method_name, *args )
      plugin_name = plugin_name.to_sym
      if @registry.has_key?( plugin_name )
        if @registry[ plugin_name ].respond_to?( method_name )
          return @registry[ plugin_name ].send( method_name, *args )
        else
          puts "No method #{method_name.inspect} for plugin #{plugin_name.inspect}"
          return false
        end
      else
        puts "No such plugin: #{plugin_name.inspect}"
        return false
      end
    end
    alias run_plugin call
    
    # Calls the servlet that matches the +req_type+ and +req.fullpath+ with
    # the highest score.
    def match_servlet( req_type, req, resp, session )
      req_uri = req.fullpath
      matches_order = match_servlet_uri( req_uri, req_type )
      return false unless matches_order
      matches_order.each do |servlet_name|
        begin
          @registry[servlet_name].send( req_type, req, resp, session )
          return true
        rescue => e
          plugin_error(
            e,
            "RSence::PluginManager.match_servlet",
            "servlet_name: #{servlet_name.inspect}, req_type: #{req_type.inspect}",
            servlet_name
          )
          next
        end
      end
      return false
    end
  end
end
