/**
  * Riassence Core -- http://rsence.org/
  *
  * Copyright (C) 2009 Juha-Jarmo Heinonen <jjh@riassence.com>
  *
  * This file is part of Riassence Core.
  *
  * Riassence Core is free software: you can redistribute it and/or modify
  * it under the terms of the GNU General Public License as published by
  * the Free Software Foundation, either version 3 of the License, or
  * (at your option) any later version.
  *
  * Riassence Core is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  * GNU General Public License for more details.
  *
  * You should have received a copy of the GNU General Public License
  * along with this program.  If not, see <http://www.gnu.org/licenses/>.
  *
  **/

HTimeSheet = HControl.extend({
  componentName: 'timesheet',
  refreshLabel: function(){
    var hour = 1,
        hours = [],
        rowHeight = 24;
    for(; hour < 24; hour++){
      hours.push('<div style="top:'+((hour-1)*rowHeight)+'px" class="timesheet_hours_row">'+hour+':00</div>');
    }
    ELEM.setHTML(this.markupElemIds.label,hours.join(''));
    this.refreshState();
  },
  refreshState: function(){
    var line = 0,
        lines = [],
        lineHeight = 12;
    for(; line < 48; line++){
      lines.push('<div style="top:'+(line*lineHeight)+'px" class="timesheet_lines_row'+(line%2)+'"></div>');
    }
    ELEM.setHTML(this.markupElemIds.state,lines.join(''));
  },
  dragItem: false,
  createItem: function(origY){
    origY = Math.floor( origY / 12 )*12;
    var maxY = 12*48;
    if(origY>maxY){
      origY = maxY;
    }
    var item = HTimeSheetItem.nu(
      [48,origY,null,12,8,null],
      this, {
        label: 'New Item',
        events: {
          draggable: true
        }
      }
    );
    this.dragItem = item;
  },
  startDrag: function(x,y){
    this.createItem(y-this.pageY());
    this.dragItem.startDrag(x,y);
  },
  doDrag: function(x,y){
    if(this.dragItem){
      this.dragItem.doDrag(x,y);
    }
  },
  endDrag: function(x,y){
    if(this.dragItem){
      this.dragItem.endDrag(x,y);
      this.dragItem = false;
    }
  }
});

