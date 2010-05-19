##   RSence
 #   Copyright 2009 Riassence Inc.
 #   http://riassence.com/
 #
 #   You should have received a copy of the GNU General Public License along
 #   with this software package. If not, contact licensing@riassence.com
 ##

# Contains the PluginUtil module which has common methods for the bundle classes
require 'plugins/plugin_util'

# guiparser.rb contains the Yaml serializer for gui trees.
# It uses JSONRenderer on the client to build user interfaces.
require 'plugins/guiparser'

# plugin_sqlite_db.rb contains automatic local sqlite database
# creation for a plugin that includes it.
require 'plugins/plugin_sqlite_db'

# Interface for plugins in a plugin bundle
require 'plugins/plugin_plugins'

module ::RSence
  module Plugins
    
    require 'plugins/plugin'
    
    # The PluginMaker mimic class creates the Plugin class from PluginTemplate
    def self.PluginMaker
      lambda do |ns|
        klass = Class.new( PluginTemplate ) do
          def self.ns=(ns)
            define_method( :bundle_info ) do
              ns.bundle_info
            end
          end
        end
        klass.ns = ns if ns
        klass
      end
    end
    
    require 'plugins/gui_plugin'
    
    # The GUIPluginMaker mimic class creates the GUIPlugin class from GUIPluginTemplate
    def self.GUIPluginMaker
      lambda do |ns|
        klass = Class.new( GUIPluginTemplate ) do
          def self.ns=(ns)
            define_method( :bundle_info ) do
              ns.bundle_info
            end
          end
        end
        klass.ns = ns if ns
        klass
      end
    end
    
    require 'plugins/servlet'
    
    # The ServletMaker mimic class creates the Servlet class from ServletTemplate
    def self.ServletMaker
      lambda do |ns|
        klass = Class.new( ServletTemplate ) do
          def self.ns=(ns)
            define_method( :bundle_info ) do
              ns.bundle_info
            end
          end
        end
        klass.ns = ns if ns
        klass
      end
    end
    
    # Loads bundle according to the +params+ hash.
    # Some essential params:
    #  :src_path    => '/path/of/the_plugin/the_plugin.rb'
    #  :bundle_path => '/path/of/the_plugin'
    #  :bundle_name => :the_plugin
    def self.bundle_loader( params )
      src_path = params[:src_path]
      begin
        mod = Module.new do |m|
          if RUBY_VERSION.to_f >= 1.9
            m.define_singleton_method( :bundle_path ) do
              params[:bundle_path]
            end
          end
          def self.inspect; "#<module BundleWrapper of #{@@bundle_name}}>"; end
          def self.const_missing( name )
            if name == :Servlet
              return Plugins.ServletMaker.call( self )
            elsif name == :ServletPlugin
              warn "'ServletPlugin' is deprecated, use 'Servlet' instead."
              return Plugins.ServletMaker.call( self )
            elsif name == :Plugin
              return Plugins.PluginMaker.call( self )
            elsif name == :GUIPlugin
              return Plugins.GUIPluginMaker.call( self )
            else
              warn "Known const missing: #{name.inspect}"
              super
            end
          end
          plugin_src = File.read( src_path )
          unless RUBY_VERSION.to_f >= 1.9
            plugin_src = ["bundle_path = #{params[:bundle_path].inspect}", plugin_src].join("\n")
          end
          m.module_eval( plugin_src )
        end
        return mod
      rescue => e
        params[:plugin_manager].plugin_error(
          e,
          'BundleLoaderError',
          "An error occurred while loading the plugin bundle #{params[:bundle_name]}.",
          src_path
        )
      end
    end
  end
end