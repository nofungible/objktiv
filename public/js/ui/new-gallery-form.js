(function () {
    var Util = window.Util;

    function NewGalleryForm(state, el) {
        this._state = state;
        this._el = el;
    }

    NewGalleryForm.prototype.attachGestureHandlers = function () {
        /**
         * Clear placeholder text when user clicks input or placeholder text.
         */

        var input = this._el.getElementsByClassName('new-gallery-input').item(0);

        input.addEventListener('click', function (evt) {
            this.clearGalleryInput();
        }.bind(this));

        var placeholder = this._el.getElementsByClassName('new-gallery-input-placeholder').item(0);

        placeholder.addEventListener('click', this.clearGalleryInput.bind(this));

        /**
         * Reapply placeholder text when user stops interacting with input field.
         */

        input.addEventListener('blur', function () {
            if (input.innerText === '') {
                input.innerHTML = '<span class="new-gallery-input-placeholder placeholder-text">create new gallery</span>';
                input.setAttribute('data-empty', 'true');
            }
        });

        /**
         * Submit new gallery form when user clicks submit or hits 'Enter' key.
         */

        this._el.getElementsByClassName('new-gallery-submit').item(0).addEventListener('click', function (evt) {
            this.submitNewGallery.bind(this);
        }.bind(this));

        input.addEventListener('keypress', function(evt) {
            if (evt.code && evt.code === 'Enter' || evt.keyCode && evt.keyCode === 13) {
                this.submitNewGallery();
                evt.preventDefault();
            }
        }.bind(this));
    };

    // Remove placeholder text from new gallery input field.
    NewGalleryForm.prototype.clearGalleryInput = function () {
        var input = this._el.getElementsByClassName('new-gallery-input').item(0);

        if (input.getAttribute('data-empty') === 'true') {
            input.innerText = '';
        }
    };

    // Append new gallery form HTML and attach gesture handlers.
    NewGalleryForm.prototype.render = function () {
        this._el.innerHTML = '<span class="new-gallery-submit">+</span>'
                            +'<div class="new-gallery-input" contenteditable wrap="off" data-empty="true">'
                            +    '<span class="new-gallery-input-placeholder placeholder-text">create new gallery</span>'
                            +'</div>';

        this.attachGestureHandlers();
    };

    // Gather new gallery name and emit gallery create event.
    NewGalleryForm.prototype.submitNewGallery = function () {
        var input = this._el.getElementsByClassName('new-gallery-input').item(0);
        var newGalleryName = input.textContent;

        if (newGalleryName) {
            input.textContent = '';

            this._state.eventEmitter.emit(Util.eventKeys.DISPATCH_GALLERY_CREATE, {name: newGalleryName});
        }
    };

    window.NewGalleryForm = NewGalleryForm;
})();