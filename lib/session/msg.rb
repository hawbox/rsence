##   Riassence Framework
 #   Copyright 2006 Riassence Inc.
 #   http://riassence.com/
 #
 #   You should have received a copy of the GNU General Public License along
 #   with this software package. If not, contact licensing@riassence.com
 ##

module Riassence
module Server
require 'util/gzstring'

## Due to the single instance architecture of +Plugin+, instances of Message 
## class are used for communication between sessions and +Plugin+ instance. 
## The +Message+ instance contains session and request-response related 
## mappings and utility methods. 
##
## The Message object is initialized as 'msg' in SessionManager.
## It's passed around the system as the user/session -object namespace,
## much like 'self' is passed around in python methods.
## 
## Using the msg object saves considerate amounts of CPU cycles and memory,
## because it allows single instances of any classes that handle user data.
## 
## == HValue Initialization Example
## +HValue+ is closely related to +Message+ as instances of +HValue+ are
## used to send data between sessions and the server. This is a small
## code snippet about how to initialize several HValues as the session
## is initialized. 
## 
## def init_ses( msg )
##   msg.session[:session_name] = {    
##     :hvalue1     => HValue.new( msg, @firstvalue ),
##     :hvalue2     => HValue.new( msg, @secondvalue ),
##     :hvalue3     => HValue.new( msg, @thirdvalue )
##   }
## end
## 

class Message
  
  # Session data placeholder, assigned by SessionManager.
  attr_accessor :session 
  
  # New session flag, check it in your code to decide
  # what to do, when a new session is encountered.
  # In plugins, this usually means that some Values
  # need to be created and bound or possibly that a
  # user_id mapping needs to be done.
  attr_accessor :new_session
  
  # Old session first xhr flag, check it in your code
  # to decide what to do, when a restored session is
  # encountered. The old Values are automatically present,
  # so you should at least not re-create or re-bind them.
  attr_accessor :restored_session
  
  # Contains the source ses on the first request after this
  # session was cloned from another session.
  attr_accessor :cloned_source 
  
  # Contains the target sessions packed in an array on
  # the first request after another session was cloned
  # from this session.
  attr_accessor :cloned_targets
  
  # The session is not valid by default, it's set
  # by SessionManager, if everything seems ok.
  attr_accessor :ses_valid 
  
  # The http request object.
  attr_accessor :request 
  
  # The http response object.
  attr_accessor :response
  
  # Response output.
  attr_accessor :buffer
  
  attr_accessor :value_buffer
  
  # The request success flag.
  attr_accessor :response_success
  
  # Reference to Transporter
  attr_accessor :transporter
  
  # Reference to ValueManager
  attr_accessor :valuemanager
  
  # Reference to SessionManager
  attr_accessor :sessions
  
  # Reference to PluginManager
  attr_accessor :plugins
  
  # Message is initialized with a valid +Request+ and +Response+ objects. 
  def initialize( transporter, request, response, options )
    
    @config = ::Riassence::Server.config
    
    @request  = request
    @response_success = false
    @response = response
    @session  = nil
    @buffer = []
    
    @options = options
    
    # Value response output.
    @value_buffer = []
    
    # The session key placeholder.
    @ses_key = false
    @new_session      = false
    @restored_session = false
    @cloned_source = false
    @cloned_targets = false
    @ses_valid = false
    @error_js = ''
    
    # global instances
    @transporter    = transporter
    @valuemanager   = @transporter.valuemanager
    @sessions = @transporter.sessions
    @plugins  = @transporter.plugins
    
    if options[:servlet]
      @do_gzip = false
    else
      @response.content_type = 'text/javascript; charset=utf-8'
      @response['cache-control'] = 'no-cache'
      
      # gnu-zipped responses:
      if @request.header['accept-encoding'] and @request.header['accept-encoding'].include?('gzip') and not @config[:no_gzip]
        @response['content-encoding'] = 'gzip'
        @do_gzip = true
      else
        @do_gzip = false
      end
    end
    
    @response_sent = false
  end
  
  # Returns true for Internet Explorer 6.0
  def ie6;
    (request.header.has_key?('user-agent') and request.header['user-agent'].include?('MSIE 6.0'))
  end
  
  # Expire the session.
  def expire_session
    @sessions.expire_session( @ses_id )
  end
  
  # Define the session key.
  def ses_key=(ses_key)
    @ses_key = ses_key
  end
  
  # Getter for session key.
  def ses_key
    @ses_key
  end
  
  # Returns the user id
  def user_id
    @session[:user_id]
  end
  
  # Setter for the user id
  def user_id=(user_id)
    @session[:user_id] = user_id
  end
  
  def ses_id
    @session[:ses_id]
  end
  
  def ses_id=(ses_id)
    @session[:ses_id] = ses_id
  end
  
  def error_msg( error_js )
    @error_js = error_js
    # response_done
  end
  
  def buf_json(buffer)
    buffer.to_json
  end
  
  # Called to flush buffer.
  def response_done
    return if @response_sent
    if not @response_success
      @response.status = 200
      #@response.status = 503
      
      buffer = [
        "" # empty session key will stop the syncing
      ] + @error_js
    else
      ## The response status should always be 200 (OK)
      @response.status = 200
      
      buffer = @value_buffer + @buffer
      if @ses_key
        buffer.unshift( @ses_key )
      end
      
    end
    
    # flush the output
    if @do_gzip
      outp = GZString.new('')
      gzwriter = Zlib::GzipWriter.new(outp,Zlib::BEST_SPEED)
      gzwriter.write( buf_json(buffer) )
      gzwriter.close
    else
      outp = buf_json(buffer)
    end
    
    @response['content-length'] = outp.size
    @response.body = outp
    
    @response_sent = true
  end
  
  # Sends data to the client, usually
  # javascript, but is valid for any data.
  def reply(data,dont_squeeze=false)
    data.strip!
    data = @plugins[:client_pkg].squeeze( data ) unless dont_squeeze
    puts data if @config[:trace]
    @buffer.push( data )
  end
  
  # For value manager; insert changed values BEFORE other js.
  def reply_value(data)
    puts data if @config[:trace]
    @value_buffer.push( data )
  end
  
  # Sends data to the client's console.
  def console(data)
    reply( "console.log(#{data.to_json});" )
  end
  
  # Serves an image object +img_obj+ by returning its disposable URL. The 
  # second optional parameter +img_format+ defaults to 'PNG' and defines 
  # the format of served picture.
  def serve_img( img_obj, img_format='PNG' )
    call(:ticket,:serve_img, self, img_obj, img_format )
  end
  
  # Sends any binary to be served, returns a disposable uri. First parameter
  # defines the file data, second optional defines content type and defaults
  # to 'text/plain' and third, also optional defines the filename which 
  # defaults to 'untitled.txt'.
  def serve_file( file_data, content_type='text/plain', filename='untitled.txt' )
    call(:ticket,:serve_file, self, file_data, content_type, filename )
  end
  
  # Sends any binary to be served, returns a static uri.
  #
  # IMPORTANT: PLEASE call +release_rsrc+ manually, when you
  # don't need the resource anymore! Otherwise TicketServe will
  # keep on chugging more memory every time you serve something.
  #
  # HINT: Usually, it's a better idea to use serve_img or
  # serve_file instead.
  def serve_rsrc( rsrc_data, content_type='text/plain' )
    call(:ticket,:serve_rsrc,self, rsrc_data, content_type )
  end
  
  # Removes the uri served, you HAVE TO call this manually when
  # you are done serving something! Takes the uri as its only parameter.
  def release_rsrc( uri )
    run(:ticket,:del_rsrc, uri[3..-1] )
  end
  alias unserve_rsrc release_rsrc
  
  # Calls registered plugin +plugin+ method +plugin_method+ with any +args+
  def call( plugin_name, plug_method, *args )
    @plugins.call( plugin_name, plug_method, *args)
  end
  alias run call
  
end

end
end