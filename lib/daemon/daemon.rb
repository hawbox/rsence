#--
##   Riassence Framework
 #   Copyright 2008 Riassence Inc.
 #   http://riassence.com/
 #
 #   You should have received a copy of the GNU General Public License along
 #   with this software package. If not, contact licensing@riassence.com
 ##
 #++

# Use rubygems to load rack
require 'rubygems'
require 'rack'

# Loads the selected web-server (default is 'thin')
require RSence.config[:http_server][:rack_require]

# Methods that return rack the selected handler
def rack_webrick_handler;  Rack::Handler::WEBrick;  end
def rack_ebb_handler;      Rack::Handler::Ebb;      end
def rack_thin_handler;     Rack::Handler::Thin;     end
def rack_mongrel_handler;  Rack::Handler::Mongrel;  end
def rack_unicorn_handler;  Rack::Handler::Unicorn;  end
def rack_rainbows_handler; Rack::Handler::Rainbows; end

# Selects the handler for Rack
RSence.config[:http_server][:rack_handler] = self.method({
  'fuzed'    => :rack_fuzed_handler,
  'webrick'  => :rack_webrick_handler,
  'ebb'      => :rack_ebb_handler,
  'thin'     => :rack_thin_handler,
  'mongrel'  => :rack_mongrel_handler,
  'unicorn'  => :rack_unicorn_handler,
  'rainbows' => :rack_rainbows_handler
}[RSence.config[:http_server][:rack_require]]).call

# Transporter is the top-level handler for calls coming from the javascript COMM.Transporter.
require 'transporter/transporter'

## Broker routes requests to the correct handler
require 'http/broker'


module ::RSence

@@launch_pid = Process.pid
def self.launch_pid
  return @@launch_pid
end

# The Controller module handles the damonizing
# operations of the process referred to as +daemon+
module Daemon
  
  # Writes the process id to disk, the pid_fn method of the daemon contains
  # the name of the pid file.
  def self.write_pid( daemon, pid )
    File.open( daemon.pid_fn, 'w' ) do |pidfile|
      pidfile.write( pid )
    end
  end
  
  # Reads the process id from disk, the pid_fn method of the daemon contains
  # the name of the pid file. Returns nil on errors.
  def self.read_pid( daemon )
    File.read( daemon.pid_fn ).to_i rescue nil
  end
  
  def self.responds?( daemon )
    wait_signal_response( daemon, 'USR2' )
  end
  
  # Reads the pid file and calls the process.
  # Returns true if the process responds, false otherwise (no process)
  def self.status( daemon )
    pid = read_pid( daemon )
    return nil if not pid
    return responds?( daemon )
  end
  
  # Redirects standard input and errors to the log files
  def self.start_logging( daemon )
    outpath = "#{daemon.log_fn}.stdout"
    errpath = "#{daemon.log_fn}.stderr"
    STDOUT.reopen( outpath, (File.exist?( outpath ) ? 'a' : 'w') )
    STDOUT.sync = true
    STDERR.reopen( errpath, (File.exist?( errpath ) ? 'a' : 'w') )
    STDERR.sync = true
  end
  
  def self.write_signal_response( daemon, signal )
    pid = Process.pid.to_s
    pid_fn = daemon.pid_fn
    RSence::SIGComm.write_signal_response( pid, pid_fn, signal )
  end
  
  def self.delete_signal_response( daemon, signal )
    pid_fn = daemon.pid_fn
    RSence::SIGComm.delete_signal_response( pid_fn )
  end
  
  def self.wait_signal_response( daemon, signal, timeout = 10,
                                 debug_pre = false, debug_suf = false, sleep_secs = 0.2 )
    pid = read_pid( daemon )
    pid_fn = daemon.pid_fn
    return RSence::SIGComm.wait_signal_response( pid, pid_fn, signal, timeout, debug_pre, debug_suf, sleep_secs )
  end
  
  # Traps common kill signals
  def self.trap_signals( daemon )
    
    # Triggered with 'kill -USR1 `cat rsence.pid`'
    Signal.trap( 'USR1' ) do 
      daemon.usr1
      write_signal_response( daemon, 'USR1' )
    end
    Signal.trap('USR2') do 
      daemon.usr2
      write_signal_response( daemon, 'USR2' )
    end
    ['INT', 'TERM', 'KILL'].each do | signal |
      Signal.trap( signal ) do
        puts "RSence killed with signal #{signal.inspect}" if RSence.args[:verbose]
        daemon.usr1
        daemon.stop
        delete_stale_pids( daemon )
        write_signal_response( daemon, signal )
        puts "Shutdown complete."
        exit
      end
    end
    Signal.trap('HUP') do
      daemon.stop
      daemon.start
    end
  end
  
  def self.delete_stale_pids( daemon )
    ( pid_fn_path, pid_fn_name ) = File.split( daemon.pid_fn )
    Dir.entries( pid_fn_path ).each do | item_fn |
      item_path = File.join( pid_fn_path, item_fn )
      if item_fn.start_with?( pid_fn_name ) and File.file?( item_path )
        puts "Stale pid file (#{item_fn}), removing.." if RSence.args[:verbose]
        File.delete( item_path )
      end
    end
  end
  
  def self.init_pid( daemon )
    if RSence.pid_support?
      is_running = status( daemon )
      if is_running
        puts "RSence is already running."
        puts "Stop the existing process first: see 'rsence help stop'"
        if RSence.launch_pid != Process.pid
          Process.kill( 'INT', RSence.launch_pid )
        end
        exit
      elsif not is_running
        delete_stale_pids( daemon )
      end
      trap_signals( daemon )
      pid = Process.pid
      write_pid( daemon, pid ) 
      return pid
    else
      return false
    end
  end
  
  def self.run( daemon )
    init_pid( daemon )
    daemon.run
    exit
  end
  
  def self.start( daemon )
    fork do
      exit if fork
      init_pid( daemon )
      daemon.start
    end
    Signal.trap('INT') do
      puts "RSence startup failed. Please inspect the log and/or run in debug mode."
      exit
    end
    Signal.trap('TERM') do
      puts "RSence is online at http://#{daemon.addr}:#{daemon.port}/"
      exit
    end
    sleep 1 while true
  end
  
  # Sends the USR1 signal to the process, which in turn
  # calls the save method of the daemon.
  def self.save( daemon )
    status_ = status( daemon )
    if status_
      if wait_signal_response( daemon, 'USR1', 10, 'saving.', 'saved', 0.3 )
        puts "Session data saved."
      else
        puts "Warning: saving timed out! Session data not saved."
      end
    elsif status_ == false
      puts "Warning, no such process (#{pid}) running: unable to save."
    elsif status_ == nil
      puts "No pid file: unable to save."
    else
      throw "Unexpected process status: #{status_.inspect}"
    end
  end
  
  # Sends the TERM signal to the process, which in turn
  # calls the stop method of the daemon
  def self.stop( daemon )#,is_restart=false)
    status_ = status( daemon )
    if status_
      if wait_signal_response( daemon, 'TERM', 10, 'killing.', 'killed', 0.3 )
        puts "RSence is terminated now."
      else
        puts "Warning: termination timed out!"
        puts "RSence might still be running, please ensure manually."
      end
    elsif status_ == false
      puts "Warning, no such process (#{read_pid(daemon)}) running."
    elsif status_ == nil
      puts "Warning, no pid file (process not running)."
    else
      throw "Unexpected process status: #{status_.inspect}"
    end
  end
  
  # Main entry point called from the daemon process passing +self+ as +daemon+.
  def self.daemonize( daemon )
    
    # Uses the command-line tool command to decide what to do.
    case RSence.cmd
    when :run
      run( daemon )
    when :start
      start( daemon )
    when :stop
      stop( daemon )
    when :restart
      stop( daemon )
      start( daemon )
    when :save
      save( daemon )
    end
  end
  
end

# Simple process control, constructed here and called from Daemon::Controller
class HTTPDaemon
  
  def run
    puts "Starting as a foreground process." if RSence.args[:verbose]
    puts "Press CTRL-C to terminate."
    
    @transporter = Transporter.new
    
    conf = RSence.config[:http_server]
    
    unless RSence.args[:log_fg]
      Daemon.start_logging( self )
    end
    
    # This is the main http handler instance:
    @broker = Broker.start(
      @transporter,
      conf[:rack_handler],
      conf[:bind_address],
      conf[:port]
    )
    
  end
  
  # Returns the pid file path.
  def pid_fn
    RSence.config[:daemon][:pid_fn]
  end
  
  # Returns the log path.
  def log_fn
    RSence.config[:daemon][:log_fn]
  end
  
  def addr
    RSence.config[:http_server][:bind_address]
  end
  
  def port
    RSence.config[:http_server][:port]
  end
  
  # Called by Controller#start, contains RSence-specific operations
  def start
    
    @transporter = Transporter.new
    
    conf = RSence.config[:http_server]
    
    unless RSence.args[:log_fg]
      Daemon.start_logging( self )
      STDIN.reopen( "/dev/null" )
    end
    
    Process.setsid
    
    # This is the main http handler instance:
    @broker = Broker.start(
      @transporter,
      conf[:rack_handler],
      conf[:bind_address],
      conf[:port]
    )
    yield @broker
    
  end
  
  # Called by Controller#stop, contains RSence-specific operations
  def stop
    @transporter.plugins.shutdown
    @transporter.sessions.shutdown
  end
  
  # Called on USR1 signals (save data)
  def usr1
    save
  end
  
  # Save state
  def save
    puts "Saving."
    @transporter.plugins.delegate(:flush)
    @transporter.sessions.store_sessions
    puts "Saved."
  end
  
  # Called on USR2 signals ("Alive?")
  def usr2
    puts "#{Time.now.strftime('%Y-%m-%d %H:%M:%S')} -- RSence version #{RSence.version} is running."
  end
  
  # Main entry point, daemonizes itself using Controller.
  def daemonize!
    Daemon.daemonize( self )
  end
  
end

end
