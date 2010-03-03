  ##   Riassence Framework
 #   Copyright 2009 Riassence Inc.
 #   http://riassence.com/
 #
 #   You should have received a copy of the GNU General Public License along
 #   with this software package. If not, contact licensing@riassence.com
 ##

=begin
 IndexHtmlPlugin is the servlet plugin that is responsible for initializing the "boot-strap page".
 
 It just loads, caches and sends the page for now.
=end
class IndexHtmlPlugin < ServletPlugin
  
  def match( uri, method )
    if uri == ::Riassence::Server.config[:index_html][:respond_address] and method == :get
      return true
    else
      return false
    end
  end
  
  def score
    return 1000 # allows overriding with anything with a score below 1000
  end
  
  def init
    @randgen = RandGen.new( 40 )
    ::Riassence::Server.config[:index_html][:instance] = self
  end
  
  def open
    if @plugins[:client_pkg].client_cache
      @client_rev = @plugins[:client_pkg].client_cache.client_rev
    else
      @client_rev = Time.now.to_i.to_s
    end
    #@deps = []
    @index_html_src = file_read( ::Riassence::Server.config[:index_html][:index_tmpl] )
    # loading_gif = File.read( File.join( @path, 'img/loading.gif' ) )
    # @loading_gif_id = @plugins[:ticketservices].serve_rsrc( loading_gif, 'image/gif' )
    # riassence_gif = File.read( File.join( @path, 'img/riassence.gif' ) )
    # @riassence_gif_id = $TICKETSERVE.serve_rsrc( riassence_gif, 'image/gif' )
    render_index_html
  end
  
  def close
    # $TICKETSERVE.del_rsrc( @riassence_gif_id )
    @plugins[:ticketservices].del_rsrc( @loading_gif_id )
  end
  
  def render_index_html
    
    @index_html = @index_html_src.clone
    
    @index_html.gsub!('__DEFAULT_TITLE__',::Riassence::Server.config[:index_html][:loading_title])
    # @index_html.gsub!('__LOADING_GIF_ID__',@loading_gif_id)
    # @index_html.gsub!('__RIASSENCE_GIF_ID__',@riassence_gif_id)
    @index_html.gsub!('__CLIENT_REV__',@client_rev)
    @index_html.gsub!('__CLIENT_BASE__',File.join(::Riassence::Server.config[:broker_urls][:h],@client_rev))
    # @index_html.gsub!('__CLIENT_HELLO__',::Riassence::Server.config[:broker_urls][:hello])
    @index_html.gsub!('__CLIENT_HELLO__',::Riassence::Server.config[:broker_urls][:x])
    @index_html.gsub!('__NOSCRIPT__',::Riassence::Server.config[:index_html][:noscript])
    
    deps_src = ''
    ::Riassence::Server.config[:index_html][:deps].each do |dep|
      deps_src += %{<script src="#{dep}" type="text/javascript"></script>}
    end
    @index_html.gsub!('__SCRIPT_DEPS__',deps_src)
    
    # @index_gzip = GZString.new('')
    # gzwriter = Zlib::GzipWriter.new( @index_gzip, Zlib::BEST_SPEED )
    # gzwriter.write( @index_html )
    # gzwriter.close
    
    # @content_size = @index_html.size
    # @content_size_gzip = @index_gzip.size
    
    # @index_date = httime( Time.now )
  end
  
  def session_index_html( request, response )
    ses_key = @randgen.gen
    sha_key = Digest::SHA1.hexdigest( ses_key )
    buffer = [
      "var qP=function(cmd){COMM.Queue.push(cmd);};"
    ]
    req_num = 0
    3.times do |req_num|
      msg = @plugins.transporter.xhr(
        request, response, {
          :servlet => true,
          :cookie  => (req_num==0),
          :query   => {
            'ses_key' => "#{req_num}:.o.:#{sha_key}"
          }
        }
      )
      buffer += msg.value_buffer
      msg.buffer.each do |buffer_item|
        buffer.push( "qP(function(){#{buffer_item}});")
      end
      ses_key = msg.ses_key
      sha_key = Digest::SHA1.hexdigest( ses_key + sha_key )
      # buffer = [ msg.ses_key, msg.value_buffer, msg.buffer ]
    end
    buffer.unshift( "COMM.Session.newKey(#{ses_key.to_json});" )
    buffer.unshift( "COMM.Session.sha_key=#{sha_key.to_json};" )
    buffer.unshift( "COMM.Session.req_num=#{req_num};" )
    
    buffer.each {|b|puts b}
    # require 'pp'; pp buffer
    return @index_html.gsub('__STARTUP_SEQUENCE__', buffer.join )
  end
  
  ## Outputs a static web page.
  def get( request, response, ses )
    
    response.status = 200
    
    response['Content-Type'] = 'text/html; charset=UTF-8'
    
    response['Date'] = httime( Time.now )
    
    response['Server'] = 'Riassence Framework'
    
    # support_gzip = (request.header.has_key?('accept-encoding') and \
    #                 request.header['accept-encoding'].include?('gzip')) \
    #                 and not ::Riassence::Server.config[:no_gzip]
    
    # if support_gzip
    #   response['Content-Length'] = @content_size_gzip
    #   response['Content-Encoding'] = 'gzip'
    #   response.body = @index_gzip
    # else
    
    index_html = session_index_html( request, response )
    
    response['Content-Length'] = index_html.length
    response.body = index_html
    # end
  end
  
end

index_html = IndexHtmlPlugin.new

