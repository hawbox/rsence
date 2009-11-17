/*   Riassence Framework
 *   Copyright 2006 Riassence Inc.
 *   http://riassence.com/
 *
 *   You should have received a copy of the GNU General Public License along
 *   with this software package. If not, contact licensing@riassence.com
 */

/*** = Description
  ** HImageView is a control unit intended to display images on the screen
  ** through the HTML <IMG> tag. The HImageView class is a container 
  ** to visualize
  ** images loaded via URL. It supports scaling via two class methods, 
  ** scaleToFit and scaleToOriginal. If the image is unable to be loaded, 
  ** a default blank image will be rendered.
  **
  ** = Instance variables
  ** +type+::   HImageView
  ** +value+::  URL pointing to the image that is currently shown.
  ***/
HImageView = HControl.extend({
  
/** = Description
  * HImageView constructor
  *
  * = Parameters
  * +_rect+:: An HRect object that sets the position and 
  *           dimensions of this control.
  * +_parentClass+:: - The parent view that this control is to be inserted in.
  * +_options+:: - (optional) All other parameters. See HComponentDefaults.
  *
  **/
  constructor: function(_rect, _parentClass, _options) {
    if(!_options) {
      _options={};
    }
    var _defaults = HClass.extend({
      scaleToFit: true
    });
    _options = new (_defaults.extend(_options))();
    if(this.isinherited) {
      this.base(_rect, _parentClass, _options);
    }
    else {
      this.isinherited = true;
      this.base(_rect, _parentClass, _options);
      this.isinherited = false;
    }
    if(!this.value) {
      // default to a blank image
      this.value = this.getThemeGfxPath() + "/blank.gif";
    }
    
    if(!this.isinherited) {
      this.draw();
    }
  },
  
  _makeScaleToFit: function(_parentId){
    this.elemId = ELEM.make(_parentId,'img');
    ELEM.setAttr(this.elemId,'src',this.value);
    ELEM.setAttr(this.elemId,'alt',this.label);
  },
  _makeScaleToOriginal: function(_parentId){
    this.elemId = ELEM.make(_parentId,'div');
    ELEM.setStyle(this.elemId,'background-image','url('+this.value+')');
    ELEM.setStyle(this.elemId,'background-position','0px 0px');
    ELEM.setStyle(this.elemId,'background-repeat','no-repeat');
  },
  _makeElem: function(_parentId){
    if(this.options.scaleToFit){
      this._makeScaleToFit(_parentId);
    }
    else {
      this._makeScaleToOriginal(_parentId);
    }
  },
/** = Description
  * Used to refresh HImageView if the this.value is changed.
  * 
  **/
  refreshValue: function(){
    ELEM.setAttr(this.elemId,'src',this.value);
  },
/** = Description
  * Refreshesh the label of HImageView.
  *
  **/
  refreshLabel: function(){
    ELEM.setAttr(this.elemId,'alt',this.label);
  },
  
/** = Description
  * Changes the size of the image element so that it fits in the rectangle of
  * the view.
  *
  **/
  scaleToFit: function() {
    if(!this.options.scaleToFit){
      ELEM.del(this.elemId);
      this._makeScaleToFit(this._getParentElemId());
      this.options.scaleToFit=true;
    }
  },
  
  
/** = Description
  * Resizes the image element to its original dimesions. If the image is larger
  * than the rectangle of this view, clipping will occur.
  *
  **/
  scaleToOriginal: function() {
    if(this.options.scaleToFit){
      ELEM.del(this.elemId);
      this._makeScaleToOriginal(this._getParentElemId());
      this.options.scaleToFit=false;
    }
  }


  
});
