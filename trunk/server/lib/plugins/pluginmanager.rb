# -* coding: UTF-8 -*-
###
  # Himle Server -- http://himle.org/
  # 
  # Influenced by rbot's plugins.rb by Tom Gilbert (BSD License)
  #
  # Copyright (C) 2008 Juha-Jarmo Heinonen
  # Copyright (C) 2006-2007 Helmi Technologies Inc.
  #
  # This file is part of Himle Server.
  #
  # Himle Server is free software: you can redistribute it and/or modify
  # it under the terms of the GNU General Public License as published by
  # the Free Software Foundation, either version 3 of the License, or
  # (at your option) any later version.
  #
  # Himle server is distributed in the hope that it will be useful,
  # but WITHOUT ANY WARRANTY; without even the implied warranty of
  # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  # GNU General Public License for more details.
  #
  # You should have received a copy of the GNU General Public License
  # along with this program.  If not, see <http://www.gnu.org/licenses/>.
  #
  ###

# plugin.rb contains the Plugin skeleton class
require 'plugins/plugin'

# soapserve contains an extended hsoaplet for pluginmanager usage
require 'http/soap/soapserve'

# soap_plugin includes a SOAPPlugin class, that includes plug-and-play SOAP access
require 'plugins/soap_plugin'

module Himle
module Server

=begin
 PluginManager manages plugins and delegates messages to and between them to respond to messages.
=end
class PluginManager
  
  # hash of associated plugins
  @@plugins = Hash.new
  
  # the current plugin path during scan
  @@curr_plugin_path = nil
  
  # dirlist is an array of directories to scan for available plugins
  #
  # Creates a new plugin instance, scans for available plugins in +dirlist+
  def initialize
    @dirs = $config[:plugin_paths]
    
    @soap_serve = SOAP::SOAPServe.new
    
    ## Example usage, provides all public methods of HelloServant (a regular class)
    # hello_servant = HelloServant.new
    # @soap_serve.add_servant( hello_servant, 'urn:HelloServant' )
    
    scan()
    
  end
  
  ### Access to the @soap_serve instance of SOAPServe
  def soap_serve
    @soap_serve
  end
  
  ### Routes requests and responses from transporter:
  def soap( request, response )
    @soap_serve.process( request, response )
  end
  
  # Access to the list of plugins
  def PluginManager.plugins
    return @@plugins
  end
  
  # Application module access to its own path
  def PluginManager.curr_plugin_path
    return @@curr_plugin_path
  end
  
  # Loads pluginlicotions from the list of plugin directories.
  def scan
    
    # loop through all plugin-mainlevel directories
    @dirs.each do |plugin_dir|
      
      # makes sure the plugin dir is a dir
      # (there might be files like readme.txt or licence.txt)
      if(FileTest.directory?(plugin_dir))
        
        # goes through all plugins in the
        # plugin dir in alphabetical order:
        Dir.new(plugin_dir).sort.each do |plugin_name|
          
          # skip, if the plugin starts with a dot, like '.svn', '.' and '..'
          next if(plugin_name =~ /^\./)
          
          # sets the plugin path
          @@curr_plugin_path = File.join(plugin_dir,plugin_name)
          
          # checks that the plugin is a dir
          next unless(FileTest.directory?(@@curr_plugin_path))
          
          # expects to find a 'plugin_dir/plugin_name/plugin_name.rb' file
          filename = File.join(@@curr_plugin_path,"#{plugin_name}.rb")
          next unless File.exist?(filename)
          
          # if the plugin contains a 'disabled' flag-file, it skips to the next
          next if File.exist?(File.join(@@curr_plugin_path,'disabled'))
          
          # Create a new, anonymous module as the plugin namespace.
          plugin_module = Module.new
          
          ##### Evaluates the plugin as a string in an anonymous module
          begin
            plugin_as_string = IO.readlines( filename ).join
            plugin_module.module_eval( plugin_as_string )
            
          ###### If initialization fails, print a nice stack trace
          rescue => e
            puts "=="*40 if $DEBUG_MODE
            puts "WARN: Plugin #{plugin_name} failed to initialize."
            if $DEBUG_MODE
              puts "--"*40
              puts e.message.gsub('(eval):',%{#{File.join(@@curr_plugin_path,"#{plugin_name}.rb")}:})
              puts "  #{e.backtrace.join("\n  ")}"
              puts "=="*40
            end
          end
          
        end
        
      end
      
    end
    
    open()
    
    @@curr_plugin_path = nil
    
  end
  
  # Tells all plugins to open the files or databases they need.
  def open
    delegate( 'open' )
  end
  
  # Tells all plugins that a request happened and gives the msg-parameter to them.
  def idle( msg )
    delegate( 'idle', msg )
  end
  
  # Tells all plugins to flush their data.
  def flush
    delegate( 'flush' )
  end
  
  # Tells all plugins that they are about to be terminated.
  def close
    delegate( 'close' )
  end
  
  # Restarts all running plugins
  def rescan
    flush()
    close()
    @@plugins = Hash.new
    scan()
    open()
  end
  
  # Called when everything is going down
  def shutdown
    flush()
    close()
  end
  
  ### Check if each plugin handles +method+, and if so, call it, passing +args+ as a parameter
  def delegate(method, *args)
    @@plugins.values.uniq.each do |plugin|
      puts "delegating method #{method.inspect} to plugin #{plugin.names.inspect}" if ARGV.include?('--trace-delegate')
      if plugin.respond_to?(method)
        plugin.send( method, *args )
      end
    end
  end
  
  ### Runs a plugin's (named +plugin_name+) method (named +method_name+) with the supplied +args+
  def run_plugin( plugin_name, method_name, *args )
    
    ## 
    if @@plugins.has_key?( plugin_name )
      if @@plugins[plugin_name].respond_to?( method_name )
        return @@plugins[plugin_name].method( method_name ).call(*args)
      end
    end
  end
  
end

end
end
