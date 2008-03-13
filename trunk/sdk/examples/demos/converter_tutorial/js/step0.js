/***  HIMLE RIA SYSTEM
  ** 
  **  Copyright (C) 2008 HIMLE GROUP http://himle.sorsacode.com/
  **  Copyright (C) 2006-2007 Helmi Technologies Inc.
  ** 
  **  This program is free software; you can redistribute it and/or modify it under the terms
  **  of the GNU General Public License as published by the Free Software Foundation;
  **  either version 2 of the License, or (at your option) any later version. 
  **  This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
  **  without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  **  See the GNU General Public License for more details. 
  **  You should have received a copy of the GNU General Public License along with this program;
  **  if not, write to the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
  ***/


unitConverterConfig = {
  themePath:   '../../release/latest/themes'
};


UnitConverter = HApplication.extend({
  constructor: function(){
    this.base();
    window.status = 'Hello, World!';
  }
});


var initUnitConverter = function(){
  HThemeManager.setThemePath( unitConverterConfig.themePath );
  this.myUnitConverter = new UnitConverter();
}

onloader('initUnitConverter();');