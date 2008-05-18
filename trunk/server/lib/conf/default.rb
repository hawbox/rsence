###
  # Himle Server -- http://himle.org/
  #
  # Copyright (C) 2008 Juha-Jarmo Heinonen
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

require 'rubygems'
require 'rack'

## Paths for log and pid files
PIDPATH = File.join(SERVER_PATH,'var','run')
LOGPATH = File.join(SERVER_PATH,'var','log')

## Client by default is "server/client"
CLIENT_PATH = ARGV.include?('--client-path')?(ARGV[ARGV.index('--client-path')+1]):File.join( SERVER_PATH, '..', 'client' )

## Global configuration hash
$config = {
  
  ## This setting should be on, until Rack supports chunked transfers (and as such, transfer encodings for gzip)
  :no_gzip => true,
  
  ## Enabling this appends all msg.reply call output to stdout
  :trace   => ARGV.include?('--trace-js'),
  
  ## Path to the server root (containing lib, rsrc etc..)
  :dir_root    => SERVER_PATH,
  
  ## Path to the client root (containing js and themes dirs)
  :client_root => CLIENT_PATH,
  
  ## Switches on debug-mode:
  ##  - Generates more output
  ##  - Each time /hello is post-requested:
  ##    - Plugins are reloaded from source 
  ##    - GZFiles are reloaded (if more recent than in memory)
  :debug_mode  => (ARGV.include?('-d') or ARGV.include?('--debug')),
  
  ## Web server-related settings:
  :http_server  => {
    
    ## HTTP Port number:
    :port           => ARGV.include?('--port')?(ARGV[ARGV.index('--port')+1].to_i):8001,
    
    ## Bind this ip address ('0.0.0.0' means all)
    :bind_address   => ARGV.include?('--addr')?(ARGV[ARGV.index('--addr')+1]):'0.0.0.0',
    
    ## Rack handler to use
    :rack_require   => ARGV.include?('--server')?(ARGV[ARGV.index('--server')+1]):'mongrel',
    :rack_handler   => nil # automatic
  },
  
  ## When disabled, tries to prevent all request caching
  :cache_maximize => false,
  
  ## When cache_maximize is enabled,
  ## this is the time (in seconds) the cached content will expire in
  :cache_expire   => 14515200,
  
  ## Client-related paths (fileserve)
  :client_parts => {
    
    ## The paths FileServe uses to load client js, css and html templates
    :js      => File.join( CLIENT_PATH, 'js'      ),
    :themes  => File.join( CLIENT_PATH, 'themes'  )
  },
  
  ## Old param, essentially always the same as SERVER_PATH
  :sys_path     => SERVER_PATH,
  
  ## Paths to scan for available plugins
  :plugin_paths    => [
    File.join( SERVER_PATH, 'plugins' )
    #File.join( PATH_TO_ALT_PLUGINS, 'plugins' )
  ],
  
  ## The global Transporter instance will be bound to:
  :transporter => nil,
  
  ## The global IndexHtml instance will be bound to:
  :indexhtml   => nil,
  
  ## The global FileCache instance will be bound to:
  :filecache   => nil,
  
  ## The global FileServe instance will be bound to:
  :fileserve   => nil,
  
  ## The global TicketServe instance will be bound to:
  :ticketserve => nil,
  
  ## The global Broker instance will be bound to:
  :broker => nil,
  
  ## The global SessionManager instance will be bound to:
  :sessionmanager => nil,
  
  ## The global PluginManager instance will be bound to:
  :plugins => nil,
  
  ## Transporter settings:
  :transporter_conf => {
    ## Message strings
    :messages => {
      
      # If the client fails on javascript, display this:
      :client_error => {
        :title => 'Client Error',
        :descr => 'Your web browser has encountered an javascript error.<br />Please reload the page to continue.<br />Error encountered:<br />',
        :uri   => '/'
      }
    }
  },
  
  ## IndexHtml settings:
  :indexhtml_conf => {
    ## The initial index.html page <title>
    :loading_title  => 'Himle Loading...',
    
    ## The initialized html page <title>
    :loaded_title   => 'Himle',
  },
  
  ## Session-related settings
  :session_conf => {
    
    ## The comment string in the session cookie
    :ses_cookie_comment => "Himle session key (just for your convenience)",
    
    ## Disposable keys, when enabled, changes the session id on each xhr
    :disposable_keys    => true,
    
    ## Timeout controls how long a session is valid
    :timeout_secs       => 15*60, # 15 minutes
    
    ## Key length controls the length of the random-part of the key.
    ## The total length is actually key length + 12 bytes, because
    ## the uniqueness part is 12 bytes long
    :key_length         => 64,
    
    ## Cookie keys are this many times longer than xhr keys
    :cookie_key_multiplier => 3,
    
    ## The amount of pre-generated keys to keep
    ## Tweaking this might affect performance
    :buffer_size        => 600,
    
    ## When enabled, deletes all old sessions upon server startup
    :reset_sessions     => (ARGV.include?('--reset-sessions=true') or ARGV.include?('--reset-sessions')),
    
    ## Message strings
    :messages => {
      
      # if the session is invalid for one reason or another, display this:
      :invalid_session => {
        :title => 'Invalid Session',
        :descr => 'Your session is invalid. Please reload the page to continue.',
        :uri   => '/'
      }
    }
    
  },
  
  ## Database configuration
  :database => {
  
    # root_setup should ideally have permissions
    # to create the auth_setup account and database,
    # but if the access fails, it'll fall back to
    # auth_setup, if it's created manually
    :root_setup => {
      :host => 'localhost', # try '127.0.0.1' if this fails with your mysql configuration
      :user => 'root',
      :pass => '',
      :db   => 'mysql'
    },
    
    # auth_setup is the mysql connection himle uses
    # to handle session tables. It's obligatory.
    :auth_setup => {
      :host => 'localhost',
      :user => 'himle',
      :pass => 'bbJNhmtwtOBu6',
      :db   => 'himle'
    }
  
  },
  
  ## ValueManager settings
  :values_conf => {
    ## Key length controls the length of the random-part of the key.
    ## The total length is actually key length + 12 bytes, because
    ## the uniqueness part is 12 bytes long
    :key_length    => 20, # 32 bytes long value keys
    
    ## The amount of pre-generated keys to keep
    ## Tweaking this might affect performance
    :buffer_size        => 600,
    
    ## Disposable keys, when enabled, changes the value id on each session restoration
    :disposable_keys    => true,
    
    ## Message strings
    :messages => {
      
      # this message is for version mismatches in hsyncvalues
      :version_mismatch => {
        :title => 'Client/Server Mismatch Error',
        :descr => 'The client and server are incompatible, reason: version mismatch. Please contact your system administrator.',
        :uri   => '/'
      }
    }
  }
  
}

## Paths of server libraries
LIB_PATHS  = [
  #File.join( SERVER_PATH, 'lib' ) ## already included in launch.rb; override this one in local config, if needed
]

## Create default local configuratation override file, if it does not exist:
local_config_file_path = File.join(SERVER_PATH,'conf','local_conf.rb')
if File.exist?(local_config_file_path)
  require local_config_file_path[0..-4]
else
  puts "NOTE:  Local configuration file #{local_config_file_path.inspect}"
  puts "       does not exist, creating a default one."
  puts "Please answer the following questions, blank lines equal to the default in brackets:"
  require 'conf/wizard'
  conf_wizard = ConfigWizard.new
  local_config_data = conf_wizard.run( local_config_file_path )
end

if ARGV.include?('--config')
  conf_file = ARGV[ARGV.index('--config')+1]
  if conf_file[0].chr != '/'
    conf_file = File.join( Dir.pwd, conf_file )
  end
  unless conf_file[-3..-1] == '.rb'
    puts "ERROR: Only ruby configuration files are supported for now."
    puts "       Future versions might include YAML support."
    exit
  end
  if File.exist?( conf_file )
    # strip the '.rb' suffix
    conf_file = conf_file[0..-4]
    require conf_file
  else
    puts "ERROR: Configuration file #{conf_file.inspect} not found."
    exit
  end
end

## Uses the lib paths as search paths
LIB_PATHS.each do |lib_path|
  $LOAD_PATH << lib_path
end

