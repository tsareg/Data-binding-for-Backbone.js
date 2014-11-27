/**
 * Backbone.DataBinding v0.4.5
 * https://github.com/DreamTheater/Backbone.DataBinding
 *
 * Copyright (c) 2013 Dmytro Nemoga
 * Released under the MIT license
 */
(function (factory) {
    'use strict';

    var isNode = typeof module === 'object' && typeof exports === 'object';

    ////////////////////

    var root = isNode ? {
        _: require('underscore'),
        Backbone: require('backbone')
    } : window;

    ////////////////////

    (isNode ? exports : Backbone).ModelBinder = factory(root, isNode);

}(function (root) {
    'use strict';

    var _ = root._, Backbone = root.Backbone;

    ////////////////////

    var modelBinder;

    ////////////////////

    var ModelBinder = Backbone.ModelBinder = function (view, model) {

        ////////////////////

        if (!(this instanceof ModelBinder)) {
            return new ModelBinder(view, model);
        }

        ////////////////////

        modelBinder = _.extend(this, {
            view: view,
            model: model
        }, {
            bindings: {}
        });

        ////////////////////

        _.extend(view, {
            render: _.wrap(view.render, function (fn) {
                fn.call(this);

                modelBinder.refresh();

                return this;
            }),

            setElement: _.wrap(view.setElement, function (fn, element, delegate) {
                if (this.$el) {
                    modelBinder.undelegateEvents();
                }

                fn.call(this, element, delegate);

                if (delegate !== false) {
                    modelBinder.delegateEvents();
                }

                return this;
            })
        });
    };

    _.extend(ModelBinder, {
        extend: Backbone.View.extend
    }, {
        handlers: {
            html: {
                getter: function () {
                    return this.html();
                },

                setter: function (value) {

                    ////////////////////

                    value = _.isNull(value) || _.isUndefined(value) ? '' : String(value);

                    ////////////////////

                    this.html(value);
                }
            },

            text: {
                getter: function () {
                    return this.text();
                },

                setter: function (value) {

                    ////////////////////

                    value = _.isNull(value) || _.isUndefined(value) ? '' : String(value);

                    ////////////////////

                    this.text(value);
                }
            },

            value: {
                getter: function () {
                    var value = this.val() || [];

                    return this.is('[multiple]') ? value : String(value);
                },

                setter: function (value) {

                    ////////////////////

                    if (_.isArray(value)) {
                        value = _.reject(value, function (value) {
                            return _.isNull(value) || _.isUndefined(value);
                        });
                    } else if (_.isNull(value) || _.isUndefined(value)) {
                        value = this.is('[multiple]') ? [] : '';
                    } else {
                        value = String(value);
                    }

                    ////////////////////

                    this.val(value);
                }
            },

            checked: {
                getter: function () {
                    var value, values = _.chain(this).where({
                        checked: true
                    }).pluck('value').value();

                    if (this.prop('type') === 'radio') {
                        value = values[0];
                    } else if (this.length === 1) {
                        value = this.prop('checked');
                    } else {
                        value = values;
                    }

                    return value;
                },

                setter: function (value) {
                    var values = _.chain([value]).flatten().reject(function (value) {
                        return _.isNull(value) || _.isUndefined(value);
                    }).value();

                    if (this.prop('type') === 'radio') {
                        this.val(values);
                    } else if (this.length === 1) {
                        this.prop('checked', value);
                    } else {
                        this.val(values);
                    }
                }
            },

            visible: {
                getter: function () {
                    return !this.prop('hidden');
                },

                setter: function (value) {
                    this.prop('hidden', !value);
                }
            },

            hidden: {
                getter: function () {
                    return this.prop('hidden');
                },

                setter: function (value) {
                    this.prop('hidden', !!value);
                }
            },

            enabled: {
                getter: function () {
                    return !this.prop('disabled');
                },

                setter: function (value) {
                    this.prop('disabled', !value);
                }
            },

            disabled: {
                getter: function () {
                    return this.prop('disabled');
                },

                setter: function (value) {
                    this.prop('disabled', !!value);
                }
            }
        }
    });

    _.extend(ModelBinder.prototype, {
        constructor: ModelBinder
    }, {
        watch: function (binding, options) {

            ////////////////////

            var bindings;

            if (!binding || _.isObject(binding)) {
                bindings = binding;
            } else {
                (bindings = {})[binding] = options;
            }

            ////////////////////

            _.each(bindings, function (options, binding) {

                ////////////////////

                options = options || {};

                ////////////////////

                this.stopListening(binding)
                    .undelegateEvents(binding)
                    ._addBinding(binding, options)
                    .delegateEvents(binding)
                    .startListening(binding);
            }, this);

            this.refresh();

            return this;
        },

        refresh: function () {

            ////////////////////

            var setters = _.pluck(this.bindings, 'setter');

            ////////////////////

            _.each(setters, function (setter) {
                if (setter) setter();
            });

            return this;
        },

        delegateEvents: function (binding) {

            ////////////////////

            var bindings = this.bindings;

            if (binding) {
                bindings = _.pick(bindings, binding);
            }

            ////////////////////

            _.each(bindings, function (options, binding) {

                ////////////////////

                var events = this._resolveEvents.call({
                        view: this.view,
                        options: options
                    }, binding),

                    selector = options.selector, getter = options.getter;

                ////////////////////

                this.undelegateEvents(binding);

                if (getter) {
                    this.view.$el.on(events, selector, getter);
                }
            }, this);

            return this;
        },

        undelegateEvents: function (binding) {

            ////////////////////

            var bindings = this.bindings;

            if (binding) {
                bindings = _.pick(bindings, binding);
            }

            ////////////////////

            _.each(bindings, function (options, binding) {

                ////////////////////

                var events = this._resolveEvents.call({
                        view: this.view,
                        options: options
                    }, binding),

                    selector = options.selector, getter = options.getter;

                ////////////////////

                if (getter) {
                    this.view.$el.off(events, selector, getter);
                }
            }, this);

            return this;
        },

        startListening: function (binding) {

            ////////////////////

            var bindings = this.bindings;

            if (binding) {
                bindings = _.pick(bindings, binding);
            }

            ////////////////////

            _.each(bindings, function (options, binding) {

                ////////////////////

                var setter = options.setter;

                ////////////////////

                this.stopListening(binding);

                if (setter) {
                    this.view.listenTo(this.model, 'change', setter);
                }
            }, this);

            return this;
        },

        stopListening: function (binding) {

            ////////////////////

            var bindings = this.bindings;

            if (binding) {
                bindings = _.pick(bindings, binding);
            }

            ////////////////////

            _.each(bindings, function (options) {

                ////////////////////

                var setter = options.setter;

                ////////////////////

                if (setter) {
                    this.view.stopListening(this.model, 'change', setter);
                }
            }, this);

            return this;
        },

        _addBinding: function (binding, options) {

            ////////////////////

            var match = binding.match(/^\s*([-\w]+)\s*:\s*([-\w]+)\s*$/),

                type = match[1],
                attribute = match[2];

            ////////////////////

            var constructor = this.constructor;

            ////////////////////

            var handlers = constructor.handlers[type],

                getter = handlers && handlers.getter,
                setter = handlers && handlers.setter;

            ////////////////////

            this.bindings[binding] = _.defaults(options, {
                getter: _.wrap(getter, function (fn) {
                    var $el = this._resolveElement.call({
                            view: this.view,
                            selector: options.selector
                        }),

                        value = fn ? fn.call($el) : $el.attr(type);

                    return this.model.set(attribute, value, options);
                }),

                setter: _.wrap(setter, function (fn) {
                    var $el = this._resolveElement.call({
                            view: this.view,
                            selector: options.selector
                        }),

                        value = this.model.get(attribute);

                    return fn ? fn.call($el, value) : $el.attr(type, value);
                })
            });

            this._bindHandlers(options);

            return this;
        },

        _bindHandlers: function (options) {

            ////////////////////

            var getter = options.getter, setter = options.setter;

            ////////////////////

            if (getter) options.getter = _.bind(getter, this);
            if (setter) options.setter = _.bind(setter, this);

            return this;
        },

        _resolveElement: function () {
            var view = this.view, selector = this.selector;

            if (_.isFunction(selector)) {
                selector = selector.call(view);
            }

            return selector ? view.$(selector) : view.$el;
        },

        _resolveEvents: function (binding) {

            ////////////////////

            var event = this.options.event || 'change';

            ////////////////////

            var events = event.match(/\S+/g);

            events = _.map(events, function (event) {
                return event + '.' + binding + '.modelBinder.' + this.view.cid;
            }, this);

            return events.join(' ');
        }
    });

    return ModelBinder;
}));

/*jshint maxstatements:12 */
(function (factory) {
    'use strict';

    var isNode = typeof module === 'object' && typeof exports === 'object';

    ////////////////////

    var root = isNode ? {
        _: require('underscore'),
        Backbone: require('backbone')
    } : window;

    ////////////////////

    (isNode ? exports : Backbone).CollectionBinder = factory(root, isNode);

}(function (root) {
    'use strict';

    var _ = root._, Backbone = root.Backbone;

    ////////////////////

    var collectionBinder;

    ////////////////////

    var CollectionBinder = Backbone.CollectionBinder = function (view, collection, options) {

        ////////////////////

        if (!(this instanceof CollectionBinder)) {
            return new CollectionBinder(view, collection, options);
        }

        ////////////////////

        collectionBinder = _.extend(this, {
            view: view,
            collection: collection,
            options: options
        }, {
            views: []
        });

        ////////////////////

        _.extend(view, {
            render: _.wrap(view.render, function (fn) {
                fn.call(this);

                collectionBinder.refresh();

                return this;
            }),

            remove: _.wrap(view.remove, function (fn) {
                collectionBinder.removeViews().removeDummy();

                fn.call(this);

                return this;
            })
        });
    };

    _.extend(CollectionBinder, {
        extend: Backbone.View.extend
    }, {
        handlers: {
            add: function (model) {
                var views = this.views, view = this._resolveView(model) || this._prepareView(model),

                    index = _.indexOf(views, view);

                if (index === -1) {
                    views.push(view);
                }

                if (view.$el.parent().length === 0) {
                    var $el = this._resolveElement.call({
                        view: this.view,
                        selector: this.options.selector
                    }, model);

                    view.$el.appendTo($el);
                }
            },

            remove: function (model) {
                var views = this.views, view = this._resolveView(model),

                    index = _.indexOf(views, view);

                if (index !== -1) {
                    views.splice(index, 1);
                }

                if (view) {
                    view.remove();
                }
            },

            reset: function (collection) {
                this.removeViews().renderViews(collection);
            },

            sort: function (collection) {
                var views = this.views, comparator = collection.comparator;

                if (comparator) {
                    if (_.isString(comparator)) {
                        this.views = _.sortBy(views, function (view) {
                            return view.model.get(comparator);
                        });
                    } else if (comparator.length === 1) {
                        this.views = _.sortBy(views, function (view) {
                            return comparator.call(collection, view.model);
                        });
                    } else {
                        views.sort(function (aView, bView) {
                            return comparator.call(collection, aView.model, bView.model);
                        });
                    }

                    this.detachViews().renderViews(collection);
                }
            }
        }
    });

    _.extend(CollectionBinder.prototype, {
        constructor: CollectionBinder
    }, {
        listen: function (options) {

            ////////////////////

            options = options || {};

            ////////////////////

            this.stopListening()
                ._addHandlers(options)
                .startListening();

            this.refresh();

            return this;
        },

        refresh: function () {

            ////////////////////

            var reset = this.handlers.reset;

            ////////////////////

            if (reset) {
                reset(this.collection);
            }

            return this;
        },

        renderViews: function (collection) {
            var models = collection.models;

            _.each(models, function (model) {
                this.handlers.add(model);
            }, this);

            return this;
        },

        removeViews: function () {
            var views = this.views;

            while (views.length > 0) {
                this.handlers.remove(views[0].model);
            }

            return this;
        },

        detachViews: function () {
            var views = this.views;

            _.each(views, function (view) {
                view.$el.detach();
            });

            return this;
        },

        renderDummy: function () {
            var dummy = this.dummy || this._prepareDummy();

            if (dummy) {
                this.dummy = dummy;

                if (dummy.$el.parent().length === 0) {
                    var $el = this._resolveElement.call({
                        view: this.view,
                        selector: this.options.selector
                    });

                    dummy.$el.appendTo($el);
                }
            }

            return this;
        },

        removeDummy: function () {
            var dummy = this.dummy;

            delete this.dummy;

            if (dummy) {
                dummy.remove();
            }

            return this;
        },

        detachDummy: function () {
            var dummy = this.dummy;

            if (dummy) {
                dummy.$el.detach();
            }

            return this;
        },

        startListening: function (event) {

            ////////////////////

            var handlers = this.handlers;

            if (event) {
                handlers = _.pick(handlers, event);
            }

            ////////////////////

            _.each(handlers, function (handler, event) {
                this.stopListening(event);

                if (handler) {
                    this.view.listenTo(this.collection, event, handler);
                }
            }, this);

            return this;
        },

        stopListening: function (event) {

            ////////////////////

            var handlers = this.handlers;

            if (event) {
                handlers = _.pick(handlers, event);
            }

            ////////////////////

            _.each(handlers, function (handler, event) {
                if (handler) {
                    this.view.stopListening(this.collection, event, handler);
                }
            }, this);

            return this;
        },

        _addHandlers: function (options) {

            ////////////////////

            var constructor = this.constructor;

            ////////////////////

            var handlers = constructor.handlers,

                add = handlers && handlers.add,
                remove = handlers && handlers.remove,
                reset = handlers && handlers.reset,
                sort = handlers && handlers.sort;

            ////////////////////

            this.handlers = _.defaults(options, {
                add: _.wrap(add, function (fn, model) {
                    this.detachDummy();

                    fn.call(this, model);
                }),

                remove: _.wrap(remove, function (fn, model) {
                    fn.call(this, model);

                    if (this.collection.isEmpty()) {
                        this.renderDummy();
                    }
                }),

                reset: _.wrap(reset, function (fn, collection) {
                    this.removeDummy();

                    fn.call(this, collection);

                    if (this.collection.isEmpty()) {
                        this.renderDummy();
                    }
                }),

                sort: _.wrap(sort, function (fn, collection) {
                    fn.call(this, collection);
                })
            });

            this._bindHandlers(options);

            return this;
        },

        _bindHandlers: function (options) {

            ////////////////////

            var add = options.add, remove = options.remove,
                reset = options.reset, sort = options.sort;

            ////////////////////

            if (add) options.add = _.bind(add, this);
            if (remove) options.remove = _.bind(remove, this);
            if (reset) options.reset = _.bind(reset, this);
            if (sort) options.sort = _.bind(sort, this);

            return this;
        },

        _resolveElement: function (model) {
            var view = this.view, selector = this.selector;

            if (_.isFunction(selector)) {
                selector = selector.call(view, model);
            }

            return selector ? view.$(selector) : view.$el;
        },

        _resolveView: function (model) {
            var views = this.views;

            return _.find(views, function (view) {
                return view.model === model;
            });
        },

        _prepareView: function (model) {

            ////////////////////

            var View = this.options.view;

            ////////////////////

            var view;

            try {
                view = new View({ model: model });
            } catch (error) {
                throw error;
            }

            return view.render();
        },

        _prepareDummy: function () {

            ////////////////////

            var Dummy = this.options.dummy;

            ////////////////////

            var dummy;

            try {
                dummy = new Dummy();
            } catch (error) {
                return;
            }

            return dummy.render();
        }
    });

    return CollectionBinder;
}));
