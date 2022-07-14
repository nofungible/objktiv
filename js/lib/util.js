'use strict';

/**
 * Block TEA crypto algorithm. Used to encrypt/decrypt user settings ciphertext.
 * https://www.movable-type.co.uk/scripts/tea-block.html
 */

!function(){function r(r,e){if(r=String(r),e=String(e),0==r.length)return"";var t=o(i(r)),u=o(i(e).slice(0,16)),c=n(t,u),d=f(c),h=a(d);return h}function e(r,e){if(r=String(r),e=String(e),0==r.length)return"";var n=o(c(r)),a=o(i(e).slice(0,16)),d=t(n,a),h=f(d),l=u(h.replace(/\0+$/,""));return l}function n(r,e){r.length<2&&(r[1]=0);for(var n,t,o=r.length,f=2654435769,i=Math.floor(6+52/o),u=r[o-1],a=r[0],c=0;i-->0;){c+=f,t=c>>>2&3;for(var d=0;o>d;d++)a=r[(d+1)%o],n=(u>>>5^a<<2)+(a>>>3^u<<4)^(c^a)+(e[3&d^t]^u),u=r[d]+=n}return r}function t(r,e){for(var n,t,o=r.length,f=2654435769,i=Math.floor(6+52/o),u=r[o-1],a=r[0],c=i*f;0!=c;){t=c>>>2&3;for(var d=o-1;d>=0;d--)u=r[d>0?d-1:o-1],n=(u>>>5^a<<2)+(a>>>3^u<<4)^(c^a)+(e[3&d^t]^u),a=r[d]-=n;c-=f}return r}function o(r){for(var e=new Array(Math.ceil(r.length/4)),n=0;n<e.length;n++)e[n]=r.charCodeAt(4*n)+(r.charCodeAt(4*n+1)<<8)+(r.charCodeAt(4*n+2)<<16)+(r.charCodeAt(4*n+3)<<24);return e}function f(r){for(var e="",n=0;n<r.length;n++)e+=String.fromCharCode(255&r[n],r[n]>>>8&255,r[n]>>>16&255,r[n]>>>24&255);return e}function i(r){return unescape(encodeURIComponent(r))}function u(r){try{return decodeURIComponent(escape(r))}catch(e){return r}}function a(r){if("undefined"!=typeof btoa)return btoa(r);if("undefined"!=typeof Buffer)return new Buffer(r,"binary").toString("base64");throw new Error("No Base64 Encode")}function c(r){if("undefined"==typeof atob&&"undefined"==typeof Buffer)throw new Error("No base64 decode");try{if("undefined"!=typeof atob)return atob(r);if("undefined"!=typeof Buffer)return new Buffer(r,"base64").toString("binary")}catch(e){throw new Error("Invalid ciphertext")}}window.BlockTEACrypto={encrypt:r,decrypt:e}}();

/**
 * Utility Classes
 */

(function () {
    var BlockTEACrypto = window.BlockTEACrypto;
    var BLOCK_TEA_PASSPHRASE = 'abc123';

    function Util() {}

    Util.eventKeys = {
        DISPATCH_NIGHT_MODE_DISABLE: 'dispatch:settings:night-mode:disable',
        DISPATCH_NIGHT_MODE_ENABLE: 'dispatch:settings:night-mode:enable',
        DISPATCH_POP_UP_GALLERY_OPEN: 'dispatch:ui:pop-up:gallery-management:open',
        DISPATCH_POP_UP_GALLERY_CLOSE: 'dispatch:ui:pop-up:gallery-management:close',
        DISPATCH_GALLERY_CREATE: 'dispatch:settings:gallery:create',
        DISPATCH_UPDATE_ITEMS_PER_PAGE: 'dispatch:settings:items-per-page:update',
        DISPATCH_SESSION_SAVE: 'dispatch:settings:saved',
        DISPATCH_SIDEBAR_TOGGLE: 'dispatch:ui:sidebar:toggle',
        DISPATCH_WALLET_SYNC: 'dispatch:wallet:sync',
        DISPATCH_WALLET_UNSYNC: 'dispatch:wallet:unsync',
        GALLERY_CREATE: 'settings:gallery:create',
        UPDATE_ITEMS_PER_PAGE: 'settings:items-per-page:update',
        KEY_ESC: 'ui:gesture:keypress:escape',
        NIGHT_MODE_ENABLED: 'settings:night-mode:enable',
        SESSION_SAVE: 'settings:saved',
        WALLET_SYNC: 'wallet:sync',
        WALLET_UNSYNC: 'wallet:unsync',
    };

    Util.viewTypes = {
        TOKEN_ARTIFACT: 'view:token-artifact',
        TOKEN_COLLECTION: 'view:token-collection',
        SETTINGS_MANAGEMENT: 'view:settings-management',
        GALLERY_MANAGEMENT: 'view:gallery-management'
    };

    Util.addSuper = function (target, parentClass) {
        target._super = {};

        for (var i = 0; i < Object.keys(parentClass.prototype).length; i++) {
            var key = Object.keys(parentClass.prototype)[i];

            if (parentClass.prototype.hasOwnProperty(key) && typeof parentClass.prototype[key] === 'function') {
                target._super[key] = (function(k, t) {
                    return function () {
                        return parentClass.prototype[k].apply(t, arguments);
                    };
                })(key, target);
            }
        }

        for (var i = 0; i < Object.keys(parentClass).length; i++) {
            var key = Object.keys(parentClass)[i];

            if (parentClass.hasOwnProperty(key) && typeof parentClass[key] === 'function') {
                target._super[key] = (function(k, t) {
                    return function () {
                        return parentClass[k].apply(t, arguments);
                    };
                })(key, target);
            }
        }
    };

    Util.copyToClipboard = function (text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .catch(function (err) {
                    console.error('Failed to copy settings to clipboard', err);
                });
        } else if (window.clipboardData) {
            try {
                window.clipboardData.setData("Text", text);
            } catch (err) {
                throw new Error('Unable to copy to clipboard');
            }
        } else {
            throw new Error('Unable to copy to clipboard');
        }
    }

    Util.decrypt = function (ciphertext) {
        var plaintext = BlockTEACrypto.decrypt(ciphertext, BLOCK_TEA_PASSPHRASE);

        try {
            var json = JSON.parse(plaintext);

            return json;
        } catch (err) {
            console.log('plaintext is not JSON');

            return plaintext;
        }
    };

    Util.encrypt = function (text) {
        var plaintext = text;

        if (typeof plaintext !== 'string') {
            try {
                plaintext = JSON.stringify(plaintext);
            } catch (err) {
                console.error('Failed to stringify ciphertext');

                throw err;
            }
        }

        return BlockTEACrypto.encrypt(plaintext, BLOCK_TEA_PASSPHRASE);
    };

    Util.getImageOrientation = function (width, height) {
        if (height === width || width - (width - height) >= width * .9) {
            return 'SQUARE';
        }

        if (height < width) {
            return 'LANDSCAPE';
        }

        return 'PORTRAIT';
    };

    Util.getHost = function () {
        return window.location.href.split('#')[0].split('?')[0];
    };

    Util.isMobile = function () {
        var toMatch = [
            /Android/i,
            /webOS/i,
            /iPhone/i,
            /iPad/i,
            /iPod/i,
            /BlackBerry/i,
            /Windows Phone/i
        ];

        return toMatch.some(function (toMatchItem) {
            return navigator.userAgent.match(toMatchItem);
        });
    };

    Util.navigateHome = function () {
        window.location.href = Util.getHost() + '?view=collection';
    };

    Util.encodeGalleryURIComponent = function (state, galleryId) {
        var gallery = state.session.galleryMap[galleryId];

        if (!gallery) {
            return false;
        }

        var address = state.wallet.getActiveAccount().address;
        var tidTokenMap = state.tokens.getCollection(address).tidTokenMap;
        var platformIdentifierMap = {
            id: galleryId
        };

        for (var i = 0; i < gallery.tokens.length; i++) {
            var token = tidTokenMap[gallery.tokens[i]];

            platformIdentifierMap[token.issuer.platform] = platformIdentifierMap[token.issuer.platform] || [];
            platformIdentifierMap[token.issuer.platform].push(token.identifier);
        }

        var tokenProviderMap = state.tokens._tokenFetch.getTokenProviders().reduce(function (acc, p) {return (acc[p.key] = p) && acc;}, {});
        var providerList = Object.keys(platformIdentifierMap);

        for (var i = 0; i < providerList.length; i++) {
            if (tokenProviderMap[providerList[i]] && tokenProviderMap[providerList[i]].parseGalleryURIComponent) {
                platformIdentifierMap[providerList[i]] = tokenProviderMap[providerList[i]].parseGalleryURIComponent(platformIdentifierMap[providerList[i]]);
            }
        }

        return encodeURIComponent(JSON.stringify(platformIdentifierMap));
    }

    Util.decodeGalleryURIComponent = function (state, uriCompoment) {
        var platformIdentifierMap;

        try {
            platformIdentifierMap = JSON.parse(uriCompoment);   
        } catch (err) {
            console.error('Failed to parse gallery URI component', uriCompoment);

            throw err;
        }

        var tokenProviderMap = state.tokens._tokenFetch.getTokenProviders().reduce(function (acc, p) {return (acc[p.key] = p) && acc;}, {});
        var providerList = Object.keys(platformIdentifierMap);

        for (var i = 0; i < providerList.length; i++) {
            if (tokenProviderMap[providerList[i]] && tokenProviderMap[providerList[i]].unparseGalleryURIComponent) {
                platformIdentifierMap[providerList[i]] = tokenProviderMap[providerList[i]].unparseGalleryURIComponent(platformIdentifierMap[providerList[i]]);
            }
        }

        return platformIdentifierMap;
    }

    Util.removeTokenFromActiveAccountGallery = function (state, galleryId, tid) {
        var tokenIndex = state.session.galleryMap[galleryId].tokens.indexOf(tid);

        if (tokenIndex === -1) {
            return false;
        }

        state.session.galleryMap[galleryId].tokens.splice(tokenIndex, 1);
        state.eventEmitter.emit(this.eventKeys.DISPATCH_SESSION_SAVE, state.wallet.getActiveAccount().address, state.session);

        return true;
    };

    Util.request = function (url, opts) {
        opts = opts || {};

        return fetch(url, opts)
            .then(function (response) {
                if (!response) {
                    return null;
                }

                var isJsonResponse = opts.headers && opts.headers['Content-Type'] === 'application/json';

                return isJsonResponse ? response.json() : response.text();
            });
    };

    Util.truncateAddress = function (tz) {
        return tz.substring(0, 4) + '...' + tz.substring(tz.length - 4, tz.length);
    };

    Util.truncateString = function (str, len) {
        return str.length > len ? str.substr(0, len) + '...' : str;
    }

    Util.querystring = function (target) {
        var map = {};
        var str = '';

        if (target) {
            if (typeof target === 'string') {
                var newMap = {};
                var qsStrings = target.split('?')[1].split('&');
    
                for (var i = 0; i < qsStrings.length; i++) {
                    var qsSegments = qsStrings[i].split('=');
    
                    newMap[qsSegments[0]] = decodeURIComponent(qsSegments[1]);
                }
    
                map = newMap;
                str = target;
            } else {
                var keys = Object.keys(target);
                var newStr = '?';
    
                for (var i = 0; i < keys.length; i++) {
                    newStr += (i > 0 ? '&' : '') + (keys[i] + '=' + encodeURIComponent(target[keys[i]]));                    
                }
    
                map = target;
                str = newStr;
            }
        }

        return {
            _map: map,
            _str: str,
            toString: function () {
                return this._str;
            },
            toObject: function () {
                return this._map;
            }
        };
    };

    window.Util = Util;
})();
