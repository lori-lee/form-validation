/**
 *
 * @author: lori@flashbay.com
 *
 **/
var formValidator = null;
+function ($) {
    "use strict";

    formValidator = function (targetForm) {
        this.form  = targetForm;
        this.currentEvent = null;
        this.events= ['blur'];

        this.ajaxCallback = null;
        this.asyncCnt = 0;

        this.listeners = {};
        this.valid     = true;
    };
    formValidator.prototype = {
        constructor: formValidator,
        isValid: function () {
            return this.valid;
        },
        /**
         * Set the form for validation
         *
         * @param <DOM/jQuery object>  form
         **/
        setForm: function (form) {
            this.form = form;
            
            return this;
        },
        /**
         * Get the form for validation
         *
         * @return DOM/jQuery Object | null
         **/
        getForm: function () {
            return this.form;
        },
        /**
         * Set the browser events for listening, 'click', 'blur', 'change', ..., etc.
         * @param <Array> events
         *
         **/
        setEvents: function (events) {
            if (Array.isArray(events)) {
                this.events = events;
            }

            return this;
        },
        /**
         * Get the browser events listened.
         *
         * @return Array | null
         **/
        getEvents: function () {
            return this.events;
        },
        /**
         * Register events for listening.
         * Currently only support 'async-over'
         *
         **/
        registerListener: function (ev, listener) {
            if ('function' === typeof listener) {
                if (!this.listeners[ev]) {
                    this.listeners[ev] = [];
                }
                this.listeners[ev].push(listener);
            }

            return this;
        },
        unregisterListener: function (ev) {
            if (this.listeners[ev]) {
                this.listners[ev] = [];
            }

            return this;
        },
        getListener: function (ev) {
            if (ev) {
                return this.listeners[ev] ? this.listeners[ev] : [];
            } else {
                return this.listeners ? this.listeners : [];
            }
        },
        getAsyncCounter: function () {
            return this.asyncCnt;
        },
        decreaseAsyncCounter: function () {
            if (this.asyncCnt > 0) {
                --this.asyncCnt;
            }
            if (0 === this.asyncCnt) {
                this.notify('async-over');
            }

            return this;
        },
        notify: function (ev) {
            var listeners = this.getListener(ev);

            for (var i = 0; i < listeners.length; ++i) {
                listeners[i].call(this);
            }
        },
        increaseAsyncCounter: function () {
            ++this.asyncCnt;

            return this;
        },
        setAjaxCallback: function (callback) {
            if ('function' === typeof callback) {
                this.ajaxCallback = callback;
            }

            return this;
        },
        showError: function (item, msg) {
            var group = $(item).closest('.form-group');

            if (group.length) {
                group.removeClass('has-success');
                group.addClass('has-error');
                var icon   = $('.form-control-feedback', group);
                var message= $('.error-message', group);

                if (icon.length) {
                    icon.removeClass('fa fa-check icon-tick');
                    icon.addClass('fa fa-close icon-close');
                }
                if (message.length) {
                    message.html(msg);
                    message.show();
                }
            }

            return this;
        },
        hideError: function (item) {
            var group = $(item).closest('.form-group');

            if (group.length) {
                group.removeClass('has-error');
                group.addClass('has-success');
                var icon   = $('.form-control-feedback', group);
                var message= $('.error-message', group);

                if (icon.length) {
                    icon.removeClass('fa fa-close icon-close');
                    icon.addClass('fa fa-check icon-tick');
                }
                if (message.length) {
                    message.html('');
                    message.hide();
                }
            }
        },
        displayErrorOrNot: function (display, item, msg) {
            if (display) {
                this.showError (item, msg);
            } else {
                this.hideError (item);
            }

            return this;
        },
        resetField: function (field) {
            if (field) {
                var nodeName = field[0].nodeName;
                var inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
                if (-1 === inputTypes.indexOf(nodeName)) {
                    for (var i = 0; i < inputTypes.length; ++i) {
                        var inputField = $(inputTypes[i], field);
                        if (inputField.length) {
                            field = inputField;
                            break;
                        }
                    }
                }
                field.val('');
                var group = $(field).closest('.form-group');

                if (group.length) {
                    group.removeClass('has-success has-error');
                }
            }
            //
            return this;
        },
        getAjaxCallback: function () {
            return this.ajaxCallback;
        },
        getDefaultAjaxCallback: function () {
            return function (item, status, params) {
                this.displayErrorOrNot (!status, item, params.message ? params.message : 'Validation failed.');
            }
        },
        ajaxValidation: function (item, value, params) {
            var item = $(item);
            var name = item.prop('name');
            var _this= this;

            this.increaseAsyncCounter();
            $.ajax({
                url: (params.url ? params.url : '') + '?' + name + '=' + encodeURIComponent(value),
                method: 'GET',
                dataType: 'json',
                async: params.async ? 'false' !== params.async.toLowerCase() && 0 !== parseFloat(params.async) : true,
                success: function (response) {
                    var status = response && response.success;
                    var callback = _this.ajaxCallback ? _this.ajaxCallback : _this.getDefaultAjaxCallback();

                    _this.decreaseAsyncCounter();
                    if (!status) _this.valid = false;

                    if ('function' === typeof callback) {
                        if (response.message) params['message'] = response.message;
                        callback.call(_this, item, status, params);
                    }
                }
            });
        },
        requiredValidation: function (item, value, params) {
            value = $.trim(value);

            return (0 !== value.length);
        },
        equalValidation: function (item, value, params) {
            //
            return (value === params.expected);
        },
        requiredIfValidation: function (item, value, params) {
            if ((params.fid || params.fname)
                && params.frule) {
                var method = params.frule + 'Validation';
                var field  = params.fid ? $('#' + params.fid) : $('[name=' + params.fname + ']', this.form);
                if (field.length && 'function' === typeof this[method]) {
                    value = $.trim(value);
                    params.fid = params.fname = params.frule = '';
                    if (0 === value.length) {
                        return false === this[method].call(this, field, field.val(), params);
                    }
                }
            }
            //
            return true;
        },
        requiredifValidation: function (item, value, params) {
            //
            return this.requiredIfValidation(item, value, params);
        },
        displayIfValidation: function (item, value, params) {
            if ((params.fid || params.fname)
                && params.rule) {
                var method= params.rule + 'Validation';
                var field = params.fid ? $('#' + params.fid) : $('[name=' + params.fname + ']', this.form);
                if (field.length && 'function' === typeof this[method]) {
                    var bDisplay = this[method].call(this, item, value, params);
                    this.displayErrorOrNot (false, field);
                    if (bDisplay) {
                        field.show();
                    } else {
                        field.hide();
                        //Clear up the dirty field left last time if has
                        this.resetField(field);
                    }
                }
            }
            //
            return true;
        },
        /**
         * Simple email address format checking.
         *
         **/
        emailValidation: function (item,value, params) {
            if (value.length > 320) return false;

            var regStr = '^(?!(?:(?:\\x22?\\x5C[\\x00-\\x7E]\\x22?)|(?:\\x22?[^\\x5C\\x22]\\x22?)){255,})(?!(?:(?:\\x22?\\x5C[\\x00-\\x7E]\\x22?)|(?:\\x22?[^\\x5C\\x22]\\x22?)){65,}@)(?:(?:[\\x21\\x23-\\x27\\x2A\\x2B\\x2D\\x2F-\\x39\\x3D\\x3F\\x5E-\\x7E]+)|(?:\\x22(?:[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x21\\x23-\\x5B\\x5D-\\x7F]|(?:\\x5C[\\x00-\\x7F]))*\\x22))(?:\.(?:(?:[\\x21\\x23-\\x27\\x2A\\x2B\\x2D\\x2F-\\x39\\x3D\\x3F\\x5E-\\x7E]+)|(?:\\x22(?:[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x21\\x23-\\x5B\\x5D-\\x7F]|(?:\\x5C[\\x00-\\x7F]))*\\x22)))*@(?:(?:(?!.*[^.]{64,})(?:(?:(?:xn--)?[a-z0-9]+(?:-+[a-z0-9]+)*\.){1,126}){1,}(?:(?:[a-z][a-z0-9]*)|(?:(?:xn--)[a-z0-9]+))(?:-+[a-z0-9]+)*)|(?:\\[(?:(?:IPv6:(?:(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){7})|(?:(?!(?:.*[a-f0-9][:\\]]){7,})(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,5})?::(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,5})?)))|(?:(?:IPv6:(?:(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){5}:)|(?:(?!(?:.*[a-f0-9]:){5,})(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,3})?::(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,3}:)?)))?(?:(?:25[0-5])|(?:2[0-4][0-9])|(?:1[0-9]{2})|(?:[1-9]?[0-9]))(?:\\.(?:(?:25[0-5])|(?:2[0-4][0-9])|(?:1[0-9]{2})|(?:[1-9]?[0-9]))){3}))\\]))$';
            var patternReg = new RegExp(regStr, 'i');

            return patternReg.test(value);
        },
        /**
         * Check whether the value is the same with the field specified.
         *
         **/
        sameValidation: function (item, value, params) {
            var target = null;
            if (params && params.id) {
                target = $('#' + params.id);
            } else if (params && params.name) {
                target = $('[name=' + params.name + ']', this.form);
            }

            if (target.length) {
                return target.val() === value;
            } else {
                return true;
            }
        },
        /**
         * Check the twin field
         *
         **/
        sametriggerValidation: function (item, value, params) {
            var twinField = null;
            if (params && params.id) {
                twinField = $('#' + params.id);
            } else if (params && params.name) {
                twinField = $('[name=' + params.name + ']', this.form);
            }
            if (twinField.length) {
                twinField.trigger(this.events.join(' '));
            }

            return true;
        },
        /**
         * Check whether the value is different with the field specified.
         *
         **/
        differentValidation: function (item, value, params) {
            return !this.same (item, value, params);
        },
        /**
         * Check the minimumn length
         *
         **/
        minlenValidation: function (item, value, params) {
            value = $.trim(value);
            var minLen = params.len ? parseInt(params.len) : 0;

            return value.length >= minLen;
        },
        /**
         * Check the maximumn length
         *
         **/
        maxlenValidation: function (item, value, params) {
            value = $.trim(value);
            var maxLen = params.len ? parseInt(params.len) : 0;

            return value.length <= maxLen;

        },
        minValidation: function (item, value, params) {
            return parseFloat(value) >= parseFloat(params.v);
        },
        maxValidation: function (item, value, params) {
            return parseFloat(value) <= parseFloat(params.v);
        },
        betweenValidation: function (item, value, params) {
            return this.minValidation(item, value, {v: params.min})
                   && this.maxValidation(item, value, {v: params.max});
        },
        /**
         * Check that whether contains banned char within params.list or not
         *
         **/
        bannedValidation: function (item, value, params) {
            value = $.trim(value);
            if (params.list) {
                for (var i = 0; i < value.length; ++i) {
                    if (-1 !== params.list.indexOf(value.charAt(i))) {
                        return false;
                    }
                }
            }

            return true;
        },
        /**
         * Check that whether only contains char within params.list or not
         *
         **/
        allowedValidation: function (item, value, params) {
            value = $.trim(value);
            if (params.list) {
                for (var i = 0; i < value.length; ++i) {
                    if (-1 === params.list.indexOf(value.charAt(i))) {
                        return false;
                    }
                }
            }

            return true;
        },
        /**
         * Check whether the value matches the regular pattern or not.
         *
         **/
        regexValidation: function (item, value, params) {
            if (params.pattern) {
                var regex = new RegExp(params.pattern);

                return regex.test(value);
            }

            return true;
        },
        checkedValidation: function (item, value, params) {
            var checked = $(item).prop('checked');

            return checked;
        },
        /**
         *
         * Enhanced version of function split
         * Split a string with separator.
         *
         **/
        splitX: function (str, separator) {
            var result = [];

            if (str) {
                for (var s = 0, i = str.indexOf(separator, s); ;) {
                    if (-1 == i) {
                        result.push(str.substr(s));
                        break;
                    } else if (('\\' === separator && '\\' !== str.charAt(i + 1)) || ('\\' !== separator && '\\' != str.charAt(i - 1))) {
                        result.push(str.substr(s, i - s));
                        s = i + 1;
                        i = str.indexOf(separator, s);
                    } else {
                        if ('\\' === separator) {
                            i = str.indexOf(separator, i + 2);
                        } else {
                            i = str.indexOf(separator, i + 1);
                        }
                    }
                }
            }
            for (var i = 0; i < result.length; ++i) {
                result[i] = result[i].replace('\\' + separator, separator);
            }

            return result;
        },
        _validateField: function (field) {
            var field = $(field);
            var value = field.val();
            var rules = field.data('rules');

            if (rules && rules.length) {
                rules = this.splitX (rules, '|');
            }
            this.valid = true;
            if (rules && rules.length) {
                for (var i = 0; i < rules.length; ++i) {
                    var rule = this.splitX(rules[i], ':');
                    var validator = rule[0];
                    var paramsArray = rule.length >=2 ? this.splitX(rule[1], '&') : [];
                    var params      = {};

                    for (var j = 0; j < paramsArray.length; ++j) {
                        var kv = this.splitX(paramsArray[j], '=');
                        params[kv[0]] = kv[1];
                    }
                    
                    var method = validator + 'Validation';

                    if ('function' === typeof this[method]) {
                        if (false === this[method].call(this, field, value, params)) {
                            this.valid = false;
                            this.displayErrorOrNot (true, field, params.message ? params.message : 'Validation failed.');
                            break;
                        } else {
                            //this.displayErrorOrNot (false, field);
                        }
                    }
                }
                if (!this.getAsyncCounter() && i == rules.length) {
                    this.displayErrorOrNot (false, field);
                }
            }
        },
        delegationHandler: function (ev) {
            // 
            this.currentEvent = ev;
            this._validateField(ev.target);

            return this;
        },
        validateAll: function () {
            var allFields = $('select:visible:not([disabled]), input:not([type=checkbox]):not([type=radio]):visible:not([disabled]), textarea:visible:not([disabled])', this.form);
            var valid =  true;
            for (var i = 0; i < allFields.length; ++i) {
                this._validateField (allFields[i]);
                
                if (false === this.isValid()) {
                    valid = false;
                }
            }
            this.valid = valid;

            return this;
        },
        run: function () {
            $(this.form).delegate('select:visible:not([disabled]), input:visible:not([type=checkbox]):not([type=radio]):not([disabled]), textarea:visible:not([disabled])', this.events.join(' '), this.delegationHandler.bind(this));
            //$(document).delegate(this.form, 'submit', this.validateAll.bind(this));
        }
    };
}(window.jQuery);
