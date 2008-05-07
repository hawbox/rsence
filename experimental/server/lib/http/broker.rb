###
  # HIMLE RIA Server
  # Copyright (C) 2008 HIMLE GROUP http://himle.sorsacode.com/
  #  
  #  This program is free software; you can redistribute it and/or modify it under the terms
  #  of the GNU General Public License as published by the Free Software Foundation;
  #  either version 2 of the License, or (at your option) any later version. 
  #  This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
  #  without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  #  See the GNU General Public License for more details. 
  #  You should have received a copy of the GNU General Public License along with this program;
  #  if not, write to the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
  ###

# Restful provides the basic structure for Broker
require 'http/restful'

=begin

 Broker routes requests to the proper request processing instance

=end
class Broker
  include RestfulDispatcher
  
  ## Post requests are always xhr requests
  def post
    
    ## The full request URI:
    uri = @request.fullpath
    
    ## /x handles xhr without cookies
    if uri[0..1] == '/x'
      puts "/x: #{uri.inspect}" if DEBUG_MODE
      TRANSPORTER.xhr( @request, @response, false )
    
    ## /hello handles the first xhr (with cookies, for session key)
    elsif uri[0..5] == '/hello'
      puts "/hello: #{uri.inspect}" if DEBUG_MODE
      TRANSPORTER.xhr( @request, @response, true )
    end
    
  end
  
  ## Get requests are different, depending on the uri requested
  def get
    
    ## The full request URI:
    uri = @request.fullpath
    
    ## /j processes client framework files (js & themes)
    if uri[0..1] == '/H'
      puts "/H: #{uri.inspect}" if DEBUG_MODE
      FILESERVE.get( @request, @response )
    
    ## /i returns disposable RMagick objects rendered to data
    elsif uri[0..1] == '/i'
      puts "/i: #{uri.inspect}" if DEBUG_MODE
      TICKETSERVE.get( @request, @response, :img )
    
    ## /d returns static data resources
    elsif uri[0..1] == '/d'
      puts "/d: #{uri.inspect}" if DEBUG_MODE
      TICKETSERVE.get( @request, @response, :rsrc )
    
    ## /f return disposable data resources
    elsif uri[0..1] == '/f'
      puts "/f: #{uri.inspect}" if DEBUG_MODE
      TICKETSERVE.get( @request, @response, :file )
    
    ## all other get -requests load the index html page 
    else
      puts "/: #{uri.inspect}" if DEBUG_MODE
      INDEXHTML.get( @request, @response )
    end
    
  end
  
  
end



