
/*** = Description
  ** Simple button component, designed to be extended for any
  ** actual functionality above regular HControl.
  ** It's limited to 24px height by the default theme, because
  ** it's much simpler to render that way.
  ***/
var//RSence.Controls
HButton = HControl.extend({
  
  componentName: 'button',
  
/** = Description
  * setStyle function for button.
  *
  **/
  setStyle: function(_name, _value){
    ELEM.setStyle(this.markupElemIds.label,_name,_value);
    return this;
  }
  
});


/*** = Description
  ** Simple HButton extension, operates on its value so it's useful
  ** for sending button clicks to the server and the like.
  ** For the value responder, reset the value to 0 when read to make
  ** the button clickable again.
  **
  ** = Value states
  ** +0+::     Enabled, clickable
  ** +1+::     Disabled, clicked
  ** +Other+:: Disabled, not clickable, not clicked
  ***/
var//RSence.Controls
HClickButton = HButton.extend({
  
  defaultEvents: {
    click: true
  },
  
  controlDefaults: HControlDefaults.extend({
    clickOnValue: 1,
    clickOffValue: 0
  }),

/** = Description
  * Sets the button enabled if this.value is 0.
  *
  **/
  refreshValue: function(){
    if( this.options.inverseValue ){
      this.setEnabled( this.value === this.options.clickOnValue );
    }
    else {
      this.setEnabled( this.value === this.options.clickOffValue );
    }
  },
/** = Description
  * Click method, sets the value to disabled if the button is enabled.
  *
  **/
  click: function(){
    if(this.enabled){
      if( this.options.inverseValue ){
        this.setValue( this.options.clickOffValue );
      }
      else {
        this.setValue( this.options.clickOnValue );
      }
    }
  }
  
});

var//RSence.Controls
HClickValueButton = HClickButton;
