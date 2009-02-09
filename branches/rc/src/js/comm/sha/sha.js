/**
  * Riassence Core -- http://rsence.org/
  *
  * Copyright (C) 2007 Juha-Jarmo Heinonen <jjh@riassence.com>
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


/**
*** This File is a part of AppSpace
***
*** Copyright (c) 2007 Juha-Jarmo Heinonen <jjh@riassence.com>
***                    jjh@riassence.com
**/

// Encoder / Decoder facility

/** IMPROVED FROM: **/
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.

 * vBulletin Usage: md5hash(input,output)
 * Recommend: input = password input field; output = hidden field

 */


SHA = {
  /* hex output format. 0 - lowercase; 1 - uppercase        */
  _hexcase: 0,
  hexCase: function(){
    return SHA._hexcase;
  },
  setHexCase: function(_case){
    SHA._hexcase = _case;
  },
  
  /* base-64 pad character. "=" for strict RFC compliance   */
  _b64pad: "=",
  base64Pad: function(){
    return SHA._b64pad;
  },
  setBase64Pad: function(_pad){
    SHA._b64pad = _pad;
  },
  
  /* bits per input character. 8 - ASCII; 16 - Unicode      */
  _chrsz: 8,
  chrsz: function(){
    return SHA._chrsz;
  },
  setChrsz: function(_bits){
    SHA._chrsz = _bits;
  },
  
/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
  hexSHA1: function(_s){
    var _this=SHA;
    return _this._binb2hex(
      _this._coreSHA1(
        _this._str2binb(_s),
        _s.length * _this._chrsz
      )
    );
  },
  b64SHA1: function(_s){
    var _this=SHA;
    return _this._binb2b64(
      _this._coreSHA1(
        _this._str2binb(_s),
        _s.length * _this._chrsz
      )
    );
  },
  strSHA1: function(_s){
    var _this=SHA;
    return _this._binb2str(
      _this._coreSHA1(
        _this._str2binb(_s),
        _s.length * _this._chrsz
      )
    );
  },
  hexHmacSHA1: function(_key, _data){
    var _this=SHA;
    return _this._binb2hex(
      _this._coreHmacSHA1(_key, _data)
    );
  },
  b64HmacSHA1: function(_key, _data){
    var _this=SHA;
    return _this._binb2b64(
      _this._coreHmacSHA1(_key, _data)
    );
  },
  strHmacSHA1: function(_key, _data){
    var _this=SHA;
    return _this._binb2str(
      _this._coreHmacSHA1(_key, _data)
    );
  },
  
  str2Base64: function(_str){
    var _this=SHA;
    return _this._binb2b64(_this._str2binb(_str));
  },
  
  /*
   * Perform a simple self-test to see if the VM is working
   */
  test: function(){
    return SHA.hexSHA1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
  },

  /*
   * Calculate the SHA-1 of an array of big-endian words, and a bit length
   */
  _coreSHA1: function(_x, _len){
    var _this=SHA;
    /* append padding */
    _x[_len >> 5] |= 0x80 << (24 - _len % 32);
    _x[((_len + 64 >> 9) << 4) + 15] = _len;

    var _w = new Array(80),
        _a =  1732584193,
        _b = -271733879,
        _c = -1732584194,
        _d =  271733878,
        _e = -1009589776,
        i, _olda, _oldb, _oldc, _oldd, _olde,
        j, _t;

    for(i = 0; i < _x.length; i += 16){
      _olda = _a;
      _oldb = _b;
      _oldc = _c;
      _oldd = _d;
      _olde = _e;

      for(j = 0; j < 80; j++){
        if(j < 16){
          _w[j] = _x[i + j];
        }
        else {
          _w[j] = _this._rol(_w[j-3] ^ _w[j-8] ^ _w[j-14] ^ _w[j-16], 1);
        }
        _t = _this._safeAdd(_this._safeAdd(_this._rol(_a, 5), _this._sha1FT(j, _b, _c, _d)),
             _this._safeAdd(_this._safeAdd(_e, _w[j]), _this._sha1KT(j)));
        _e = _d;
        _d = _c;
        _c = _this._rol(_b, 30);
        _b = _a;
        _a = _t;
      }

      _a = _this._safeAdd(_a, _olda);
      _b = _this._safeAdd(_b, _oldb);
      _c = _this._safeAdd(_c, _oldc);
      _d = _this._safeAdd(_d, _oldd);
      _e = _this._safeAdd(_e, _olde);
    }
    return [_a, _b, _c, _d, _e];

  },

  /*
   * Perform the appropriate triplet combination function for the current
   * iteration
   */
  _sha1FT: function(_t, _b, _c, _d) {
    if(_t < 20){
      return (_b & _c) | ((~_b) & _d);
    }
    if(_t < 40){
      return _b ^ _c ^ _d;
    }
    if(_t < 60){
      return (_b & _c) | (_b & _d) | (_c & _d);
    }
    return _b ^ _c ^ _d;
  },

  /*
   * Determine the appropriate additive constant for the current iteration
   */
  _sha1KT: function(_t){
    return (_t < 20) ?  1518500249 : (_t < 40) ?  1859775393 :
           (_t < 60) ? -1894007588 : -899497514;
  },

  /*
   * Calculate the HMAC-SHA1 of a key and some data
   */
  _coreHmacSHA1: function(_key, _data){
    var _this=SHA,
        _bkey = _this._str2binb(_key),
        _ipad = new Array(16),
        _opad = new Array(16),
        i, _hash;
    if(_bkey.length > 16){
      _bkey = _this._coreSHA1(_bkey, _key.length * _this._chrsz);
    }
    for(i = 0; i  < 16; i++){
      _ipad[i] = _bkey[i] ^ 0x36363636;
      _opad[i] = _bkey[i] ^ 0x5C5C5C5C;
    }
    
    _hash = _this._coreSHA1(_ipad.concat(_this._str2binb(_data)), 512 + _data.length * _this._chrsz);
    return _this._coreSHA1(_opad.concat(_hash), 512 + 160);
  },

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   */
  _safeAdd: function(_x, _y){
    var _lsw = (_x & 0xFFFF) + (_y & 0xFFFF),
        _msw = (_x >> 16) + (_y >> 16) + (_lsw >> 16);
    return (_msw << 16) | (_lsw & 0xFFFF);
  },

  /*
   * Bitwise rotate a 32-bit number to the left.
   */
  _rol: function(_num, _cnt){
    return (_num << _cnt) | (_num >>> (32 - _cnt));
  },
  
  /*
   * Convert an 8-bit or 16-bit string to an array of big-endian words
   * In 8-bit function, characters >255 have their hi-byte silently ignored.
   */
  _str2binb: function(_str){
    var _this=SHA,
        _bin = [],
        _mask = (1 << _this._chrsz) - 1,
        _strLenChrSZ = _str.length * _this._chrsz,
        i;
    for(i = 0; i < _strLenChrSZ; i += _this._chrsz){
      _bin[i>>5] |= (_str.charCodeAt(i / _this._chrsz) & _mask) << (32 - _this._chrsz - i%32);
    }
    return _bin;
  },

  /*
   * Convert an array of big-endian words to a string
   */
  _binb2str: function(_bin){
    var _this=SHA,
        _str = "",
        _mask = (1 << _this._chrsz) - 1,
        i,
        _binLen32 = _bin.length * 32,
        _32chrsz = 32 - _this._chrsz;
    for(i = 0; i < _binLen32; i += _this._chrsz){
      _str += String.fromCharCode((_bin[i>>5] >>> (_32chrsz - i%32)) & _mask);
    }
    return _str;
  },

  /*
   * Convert an array of big-endian words to a hex string.
   */
  _binb2hex: function(_binarray){
    var _this=SHA,
        _hexTab = _this._hexcase ? "0123456789ABCDEF" : "0123456789abcdef",
        _str = "",
        i,
        _binLen = _binarray.length * 4;
    for(i = 0; i < _binLen; i++){
      _str += _hexTab.charAt((_binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
              _hexTab.charAt((_binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
    }
    return _str;
  },

  /*
   * Convert an array of big-endian words to a base-64 string
   */
  _binb2b64: function(_binarray){
    var _this=SHA,
        _tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        _str = "",
        i,
        _binLen = _binarray.length * 4,
        _t1, _t2, _3,
        _triplet,
        j,
        _binLen32 = _binarray.length * 32;
    for(i = 0; i < _binLen; i += 3){
      _t1 = (((_binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16);
      _t2 = (((_binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 );
      _t3 = ((_binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
      _triplet = (_t1 | _t2 | _t3);
      for(j = 0; j < 4; j++){
        if(i * 8 + j * 6 > _binLen32){
          _str += _this._b64pad;
        }
        else {
          _str += _tab.charAt((_triplet >> 6*(3-j)) & 0x3F);
        }
      }
    }
    return _str;
  }
};
