##   Riassence Framework
 #   Copyright 2009 Riassence Inc.
 #   http://riassence.com/
 #
 #   You should have received a copy of the GNU General Public License along
 #   with this software package. If not, contact licensing@riassence.com
 ##

## The GUIPlugin extends Plugin by automatically initializing an GUIParser
## instance as @gui
## It makes the include_js method public to enable automatic dependency
## loading based on the dependencies item in the YAML gui declaration.
## It also makes the @path public.
## It inits the gui automatically.
## Extend the gui_params method to define your own params for the gui data.
##
## HValues can be defined inside values.yaml at the root directory of
## plugin. The HValues may be linked directly with methods on the values.yaml
## as well.
##
## == Values.yaml
## :valuename:    # name of the HValue
##  :value: 2.56  # defined value
##  :responders:  # methods responding to the value on ruby code upon change
##    - :method: validate_convert_factor
##
##
##
class GUIPlugin < Plugin
  
  # Automatically initializes an GUIParser instance as @gui
  def init
    super
    @gui = GUIParser.new( self, @name )
    @client_pkgs = false
  end
  
  # Extend this method to return custom params to GUIParser#init.
  # Called from init_ui.
  # By default assigns the session values as :values to use for 
  # valueObjId: ":values.my_value_name" in the YAML GUI file.
  def gui_params( msg )
    return {
      :values => @gui.values( get_ses( msg ) )
    }
  end
  
  def install_client_pkgs
    if @client_pkgs
      warn "install_client_pkgs: called with @client_pkgs defined"
    end
    client_pkgs_yaml = file_read( 'client_pkgs.yaml' )
    if not client_pkgs_yaml
      @client_pkgs = false
    else
      @client_pkgs = YAML.load( client_pkgs_yaml )
      if @client_pkgs.has_key?(:src_dirs)
        @client_pkgs[:src_dirs].each do |src_dir|
          if src_dir.start_with?('./')
            src_dir = File.join( @path, src_dir[2..-1] )
          end
          @plugins.client_pkg.add_src_dir( src_dir )
        end
      end
      if @client_pkgs.has_key?(:packages)
        @plugins.client_pkg.add_packages( @client_pkgs[:packages] )
      end
      if @client_pkgs.has_key?(:theme_names)
        @plugins.client_pkg.add_themes( @client_pkgs[:theme_names] )
      end
      if @client_pkgs.has_key?(:gfx_formats)
        @plugins.client_pkg.add_gfx_formats( @client_pkgs[:gfx_formats] )
      end
      if @client_pkgs.has_key?(:reserved_names)
        @plugins.client_pkg.add_reserved_names( @client_pkgs[:reserved_names] )
      end
      @plugins.client_pkg.rebuild_client
    end
  end
  
  def uninstall_client_pkgs
    if not @client_pkgs
      warn "uninstall_client_pkgs: called without @client_pkgs defined"
    else
      if @client_pkgs.has_key?(:src_dirs)
        @client_pkgs[:src_dirs].each do |src_dir|
          if src_dir.start_with?('./')
            src_dir = File.join( @path, src_dir[2..-1] )
          end
          @plugins.client_pkg.del_src_dir( src_dir )
        end
      end
      if @client_pkgs.has_key?(:reserved_names)
        @plugins.client_pkg.del_reserved_names( @client_pkgs[:reserved_names] )
      end
      if @client_pkgs.has_key?(:gfx_formats)
        @plugins.client_pkg.del_gfx_formats( @client_pkgs[:gfx_formats] )
      end
      if @client_pkgs.has_key?(:theme_names)
        @plugins.client_pkg.del_themes( @client_pkgs[:theme_names] )
      end
      if @client_pkgs.has_key?(:packages)
        @plugins.client_pkg.del_packages( @client_pkgs[:packages].keys )
      end
      @plugins.client_pkg.rebuild_client
    end
    @client_pkgs = false
  end
  
  def open
    super
    install_client_pkgs if File.exist?( File.join( @path, 'client_pkgs.yaml' ) )
  end
  
  def close
    super
    uninstall_client_pkgs if @client_pkgs
  end
  
  # Sends gui specification to the main plugin
  def spec_ui( msg )
    
  end
  
  # Automatically inits the UI using GUIParser#init.
  # Passes on the return value of gui_params.
  def init_ui( msg )
    @gui.init( msg, gui_params( msg ) )
  end
  
  # Automatically kills the UI using GUIParser#kill
  def kill_ui( msg )
    @gui.kill( msg )
  end
  
  # Makes include_js public to enable calls to it from GUIParser
  public :include_js, :read_js_once
  
  attr_reader :plugins
  
end


