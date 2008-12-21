
class ComponentSampler < Plugin
  def init_ses(msg)
    msg.reply require_js_once(msg,'componentsampler')
    unless msg.session.has_key?(:componentsampler)
      msg.session[:componentsampler] = {
        :main_tabs => HValue.new(msg,0),
        :checkbox1 => HValue.new(msg,false),
        :checkbox2 => HValue.new(msg,true),
        :radio_a   => HValue.new(msg,3),
        :radio_b   => HValue.new(msg,1),
        :upload1   => HValue.new(msg,'')
      }
    end
    setup_upload(msg,msg.session[:componentsampler][:upload1])
    msg.session[:componentsampler][:upload1].bind('componentsampler','handle_upload')
  end
  alias restore_ses init_ses
  def init_ui(msg)
    mses = msg.session[:main]
    cses = msg.session[:componentsampler]
    include_js( msg, ['controls','default_theme'] )
    msg.reply(%{
      componentSampler = new ComponentSampler({
        main_tabs: #{cses[:main_tabs].val_id.to_json},
        checkbox1: #{cses[:checkbox1].val_id.to_json},
        checkbox2: #{cses[:checkbox2].val_id.to_json},
        radio_a:   #{cses[:radio_a].val_id.to_json},
        radio_b:   #{cses[:radio_b].val_id.to_json},
        upload1:   #{cses[:upload1].val_id.to_json}
      });
    })
  end
  def handle_upload(msg,hvalue)
    
    # the data should contain both state and key in the value
    upload_value = hvalue.data
    
    # the state and key are separated by the ':::' delimitter string
    if upload_value.include?(':::')
      
      # split state and key using the delimitter
      (upload_state, upload_key) = upload_value.split(':::')
      
      # the state is a number
      upload_state = upload_state.to_i
      
      # negative states are errors
      if upload_state < 0
        # "upload error: #{upload_state}"
        # (parse the error)
        
        msg.console( "upload error: #{upload_state}" )
        
      # the default state, 0 means the ui is ready to send an
      # upload and ticketserve is ready to receive it
      elsif upload_state == 0
        # "upload state: ready to upload."
        # (do nothing)
        
        msg.console( "upload state: ready to upload" )
        
      
      # this state means the upload's transfer is started and progressing
      elsif upload_state == 1
        # "upload state: upload started."
        # (show progress bar)
        
        msg.console( "upload state: upload started" )
        
      
      # this state means the upload's transfer is complete,
      # but the uploaded data hasn't been handled yet.
      elsif upload_state == 2
        # "upload state: waiting to process."
        
        msg.console( "upload state: waiting to process" )
        
        
        uploads = $TICKETSERVE.get_uploads(upload_key,true)
        if uploads.size == 1
          uploaded_data = uploads[0]
          
          #upload_status = true # upload_handler( uploaded_data )
          #if upload_status == true
          #  setup_upload( msg, hvalue )
          #end
          
          $TICKETSERVE.del_uploads(upload_key,msg.ses_id)
        else
          # "upload, amount of uploads: #{uploads.size}"
        end
        
        # 
        hvalue.set(msg,"3:::#{upload_key}")
        
        msg.console( "upload state: set to ack" )
        
      elsif upload_state == 3
        # "upload state: waiting for user ack."
        # (do nothing)
        
        msg.console( "upload state: waiting user ack" )
        
        
      elsif upload_state == 4
        # "upload state: user wants to upload again."
        # (set a new upload key, )
        
        msg.console( "upload state: ack, getting new key" )
        
        
        setup_upload( msg, hvalue )
        
        
      else
        # "upload unknown state: #{upload_state.inspect}"
      end
    end
    return true
  end
  def setup_upload(msg,hvalue,size_bytes=500*1024,accept_mime=/image\/(.*?)/,allow_multi=false)
    upload_key = $TICKETSERVE.upload_key(msg,hvalue.val_id,size_bytes,accept_mime,allow_multi)
    hvalue.set( msg, upload_key )
  end
end

plugin = ComponentSampler.new
plugin.register('componentsampler')
