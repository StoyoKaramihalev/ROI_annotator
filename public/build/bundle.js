
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.24.0 */

    const { Object: Object_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i].x;
    	child_ctx[41] = list[i].y;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[48] = list[i];
    	child_ctx[50] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[44] = list[i][0];
    	child_ctx[45] = list[i][1].name;
    	child_ctx[11] = list[i][1].points;
    	return child_ctx;
    }

    // (122:8) {#each points as point, index}
    function create_each_block_2(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;
    	let mounted;
    	let dispose;

    	function mousemove_handler(...args) {
    		return /*mousemove_handler*/ ctx[25](/*index*/ ctx[50], /*key*/ ctx[44], ...args);
    	}

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", circle_cx_value = /*point*/ ctx[48].x);
    			attr_dev(circle, "cy", circle_cy_value = /*point*/ ctx[48].y);
    			attr_dev(circle, "r", /*r*/ ctx[12]);
    			attr_dev(circle, "fill", "darkgreen");
    			attr_dev(circle, "class", "point svelte-1fp8hvv");
    			add_location(circle, file, 122, 10, 4173);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(circle, "mousemove", mousemove_handler, false, false, false),
    					listen_dev(circle, "mousedown", /*mousedown_handler*/ ctx[26], false, false, false),
    					listen_dev(circle, "mouseup", /*mouseup_handler*/ ctx[27], false, false, false),
    					listen_dev(circle, "mouseleave", /*mouseleave_handler*/ ctx[28], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*regions*/ 16 && circle_cx_value !== (circle_cx_value = /*point*/ ctx[48].x)) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*regions*/ 16 && circle_cy_value !== (circle_cy_value = /*point*/ ctx[48].y)) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(122:8) {#each points as point, index}",
    		ctx
    	});

    	return block;
    }

    // (119:6) {#each Object.entries(regions).filter(([k, v]) => v.points) as [key, {name: rname, points}
    function create_each_block_1(ctx) {
    	let text_1;
    	let t_value = /*rname*/ ctx[45] + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;
    	let polyline;
    	let polyline_points_value;
    	let each_1_anchor;
    	let each_value_2 = /*points*/ ctx[11];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			polyline = svg_element("polyline");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(text_1, "x", text_1_x_value = /*points*/ ctx[11][0].x);
    			attr_dev(text_1, "y", text_1_y_value = /*points*/ ctx[11][0].y - 5);
    			attr_dev(text_1, "fill", "white");
    			attr_dev(text_1, "class", "not-selectable svelte-1fp8hvv");
    			add_location(text_1, file, 119, 8, 3937);
    			attr_dev(polyline, "points", polyline_points_value = /*pointify*/ ctx[16](/*points*/ ctx[11]));
    			attr_dev(polyline, "fill", "none");
    			attr_dev(polyline, "stroke", "darkgreen");
    			attr_dev(polyline, "stroke-width", "2");
    			add_location(polyline, file, 120, 8, 4038);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    			insert_dev(target, polyline, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*regions*/ 16 && t_value !== (t_value = /*rname*/ ctx[45] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*regions*/ 16 && text_1_x_value !== (text_1_x_value = /*points*/ ctx[11][0].x)) {
    				attr_dev(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*regions*/ 16 && text_1_y_value !== (text_1_y_value = /*points*/ ctx[11][0].y - 5)) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}

    			if (dirty[0] & /*regions*/ 16 && polyline_points_value !== (polyline_points_value = /*pointify*/ ctx[16](/*points*/ ctx[11]))) {
    				attr_dev(polyline, "points", polyline_points_value);
    			}

    			if (dirty[0] & /*regions, r, circleMouseDown, circleMouseMove*/ 266512) {
    				each_value_2 = /*points*/ ctx[11];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    			if (detaching) detach_dev(polyline);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(119:6) {#each Object.entries(regions).filter(([k, v]) => v.points) as [key, {name: rname, points}",
    		ctx
    	});

    	return block;
    }

    // (132:6) {#each circles as {x, y}}
    function create_each_block(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", circle_cx_value = /*x*/ ctx[40]);
    			attr_dev(circle, "cy", circle_cy_value = /*y*/ ctx[41]);
    			attr_dev(circle, "r", /*r*/ ctx[12]);
    			attr_dev(circle, "fill", "lightblue");
    			add_location(circle, file, 132, 8, 4676);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*circles*/ 8 && circle_cx_value !== (circle_cx_value = /*x*/ ctx[40])) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*circles*/ 8 && circle_cy_value !== (circle_cy_value = /*y*/ ctx[41])) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(132:6) {#each circles as {x, y}}",
    		ctx
    	});

    	return block;
    }

    // (135:6) {#if regions.reference.length > 0}
    function create_if_block_1(ctx) {
    	let polyline;
    	let polyline_points_value;

    	const block = {
    		c: function create() {
    			polyline = svg_element("polyline");
    			attr_dev(polyline, "points", polyline_points_value = /*pointify*/ ctx[16](/*regions*/ ctx[4].reference));
    			attr_dev(polyline, "fill", "none");
    			attr_dev(polyline, "stroke", "darkred");
    			attr_dev(polyline, "stroke-width", "2");
    			add_location(polyline, file, 135, 8, 4784);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polyline, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*regions*/ 16 && polyline_points_value !== (polyline_points_value = /*pointify*/ ctx[16](/*regions*/ ctx[4].reference))) {
    				attr_dev(polyline, "points", polyline_points_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polyline);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(135:6) {#if regions.reference.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (144:2) {#if Object.keys(regions).length > 0}
    function create_if_block(ctx) {
    	let div;
    	let p;
    	let a;
    	let t0;
    	let a_href_value;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			a = element("a");
    			t0 = text("Save");
    			t1 = space();
    			input = element("input");
    			attr_dev(a, "download", /*downloadName*/ ctx[6]);
    			attr_dev(a, "href", a_href_value = `data:application/json,${JSON.stringify(/*regions*/ ctx[4], null, 4)}`);
    			add_location(a, file, 146, 4, 5120);
    			add_location(input, file, 147, 4, 5227);
    			add_location(p, file, 145, 2, 5112);
    			attr_dev(div, "class", "row");
    			set_style(div, "text-align", "center");
    			add_location(div, file, 144, 2, 5066);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, a);
    			append_dev(a, t0);
    			append_dev(p, t1);
    			append_dev(p, input);
    			set_input_value(input, /*downloadName*/ ctx[6]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[31]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*downloadName*/ 64) {
    				attr_dev(a, "download", /*downloadName*/ ctx[6]);
    			}

    			if (dirty[0] & /*regions*/ 16 && a_href_value !== (a_href_value = `data:application/json,${JSON.stringify(/*regions*/ ctx[4], null, 4)}`)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*downloadName*/ 64 && input.value !== /*downloadName*/ ctx[6]) {
    				set_input_value(input, /*downloadName*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(144:2) {#if Object.keys(regions).length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let header;
    	let h1;
    	let t1;
    	let hr0;
    	let t2;
    	let main;
    	let div4;
    	let div0;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let p2;
    	let input0;
    	let t7;
    	let div1;
    	let p3;
    	let t9;
    	let p4;
    	let t11;
    	let p5;
    	let input1;
    	let t12;
    	let p6;
    	let t14;
    	let p7;
    	let t16;
    	let p8;
    	let button0;
    	let t18;
    	let input2;
    	let t19;
    	let hr1;
    	let t20;
    	let div3;
    	let button1;
    	let t22;
    	let button2;
    	let t24;
    	let button3;
    	let t25;
    	let button3_disabled_value;
    	let t26;
    	let input3;
    	let t27;
    	let div2;
    	let svg_1;
    	let polyline;
    	let each1_anchor;
    	let t28;
    	let img_1;
    	let img_1_src_value;
    	let t29;
    	let show_if = Object.keys(/*regions*/ ctx[4]).length > 0;
    	let t30;
    	let footer;
    	let p9;
    	let t31;
    	let a0;
    	let t33;
    	let p10;
    	let t34;
    	let a1;
    	let mounted;
    	let dispose;
    	let each_value_1 = Object.entries(/*regions*/ ctx[4]).filter(func);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*circles*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = /*regions*/ ctx[4].reference.length > 0 && create_if_block_1(ctx);
    	let if_block1 = show_if && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Annotate regions of interest (ROIs)";
    			t1 = space();
    			hr0 = element("hr");
    			t2 = space();
    			main = element("main");
    			div4 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Select image:";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Choose a representative frame you wish to annotate.";
    			t6 = space();
    			p2 = element("p");
    			input0 = element("input");
    			t7 = space();
    			div1 = element("div");
    			p3 = element("p");
    			p3.textContent = "Select regions (optional):";
    			t9 = space();
    			p4 = element("p");
    			p4.textContent = "If an ROI file already exists, you may load it here.";
    			t11 = space();
    			p5 = element("p");
    			input1 = element("input");
    			t12 = space();
    			p6 = element("p");
    			p6.textContent = "Add reference line:";
    			t14 = space();
    			p7 = element("p");
    			p7.textContent = "Draw line between two reference points and input";
    			t16 = space();
    			p8 = element("p");
    			button0 = element("button");
    			button0.textContent = "Draw reference";
    			t18 = space();
    			input2 = element("input");
    			t19 = space();
    			hr1 = element("hr");
    			t20 = space();
    			div3 = element("div");
    			button1 = element("button");
    			button1.textContent = "Define ROI";
    			t22 = space();
    			button2 = element("button");
    			button2.textContent = "Clear ROI";
    			t24 = space();
    			button3 = element("button");
    			t25 = text("Save ROI");
    			t26 = space();
    			input3 = element("input");
    			t27 = space();
    			div2 = element("div");
    			svg_1 = svg_element("svg");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			polyline = svg_element("polyline");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			if (if_block0) if_block0.c();
    			t28 = space();
    			img_1 = element("img");
    			t29 = space();
    			if (if_block1) if_block1.c();
    			t30 = space();
    			footer = element("footer");
    			p9 = element("p");
    			t31 = text("Developed by: ");
    			a0 = element("a");
    			a0.textContent = "Marin Karamihalev";
    			t33 = space();
    			p10 = element("p");
    			t34 = text("GitHub ");
    			a1 = element("a");
    			a1.textContent = "Repository";
    			attr_dev(h1, "class", "svelte-1fp8hvv");
    			add_location(h1, file, 88, 2, 2434);
    			attr_dev(header, "class", "svelte-1fp8hvv");
    			add_location(header, file, 87, 0, 2423);
    			attr_dev(hr0, "style", "solid");
    			add_location(hr0, file, 90, 0, 2489);
    			add_location(p0, file, 94, 3, 2583);
    			set_style(p1, "font-size", "0.8em");
    			set_style(p1, "font-style", "italic");
    			add_location(p1, file, 95, 4, 2609);
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "accept", "image/*");
    			add_location(input0, file, 96, 7, 2718);
    			add_location(p2, file, 96, 4, 2715);
    			attr_dev(div0, "class", "column svelte-1fp8hvv");
    			add_location(div0, file, 93, 2, 2559);
    			add_location(p3, file, 99, 3, 2805);
    			set_style(p4, "font-size", "0.8em");
    			set_style(p4, "font-style", "italic");
    			add_location(p4, file, 100, 4, 2844);
    			attr_dev(input1, "type", "file");
    			attr_dev(input1, "accept", "application/JSON");
    			add_location(input1, file, 101, 7, 2954);
    			add_location(p5, file, 101, 4, 2951);
    			attr_dev(div1, "class", "column svelte-1fp8hvv");
    			add_location(div1, file, 98, 2, 2781);
    			add_location(p6, file, 103, 2, 3038);
    			set_style(p7, "font-size", "0.8em");
    			set_style(p7, "font-style", "italic");
    			add_location(p7, file, 104, 2, 3067);
    			attr_dev(button0, "class", "svelte-1fp8hvv");
    			toggle_class(button0, "pointer", /*selecting*/ ctx[1] === "refer");
    			add_location(button0, file, 106, 2, 3175);
    			attr_dev(input2, "placeholder", "Reference value");
    			add_location(input2, file, 107, 5, 3287);
    			add_location(p8, file, 105, 2, 3169);
    			attr_dev(hr1, "style", "solid");
    			add_location(hr1, file, 109, 0, 3369);
    			attr_dev(button1, "class", "svelte-1fp8hvv");
    			toggle_class(button1, "pointer", /*selecting*/ ctx[1] === "define");
    			add_location(button1, file, 111, 2, 3437);
    			add_location(button2, file, 112, 2, 3544);
    			button3.disabled = button3_disabled_value = /*roi*/ ctx[2].length < 4;
    			add_location(button3, file, 113, 2, 3590);
    			input3.required = true;
    			attr_dev(input3, "minlength", "1");
    			add_location(input3, file, 114, 2, 3660);
    			attr_dev(polyline, "points", /*points*/ ctx[11]);
    			attr_dev(polyline, "fill", "none");
    			attr_dev(polyline, "stroke", "lightblue");
    			attr_dev(polyline, "stroke-width", "1");
    			attr_dev(polyline, "stroke-dasharray", "5,5");
    			add_location(polyline, file, 130, 6, 4544);
    			attr_dev(svg_1, "class", "svelte-1fp8hvv");
    			toggle_class(svg_1, "pointer", /*selecting*/ ctx[1] !== "");
    			add_location(svg_1, file, 117, 4, 3756);
    			if (img_1.src !== (img_1_src_value = /*imgUrl*/ ctx[10])) attr_dev(img_1, "src", img_1_src_value);
    			attr_dev(img_1, "alt", " Image for annotation goes here");
    			attr_dev(img_1, "class", "svelte-1fp8hvv");
    			add_location(img_1, file, 138, 4, 4906);
    			attr_dev(div2, "class", "container not-selectable svelte-1fp8hvv");
    			add_location(div2, file, 116, 2, 3713);
    			attr_dev(div3, "class", "row");
    			set_style(div3, "text-align", "center");
    			add_location(div3, file, 110, 0, 3388);
    			attr_dev(div4, "class", "row");
    			set_style(div4, "line-height", "50%");
    			add_location(div4, file, 92, 0, 2515);
    			attr_dev(main, "class", "svelte-1fp8hvv");
    			add_location(main, file, 91, 0, 2508);
    			attr_dev(a0, "href", "https://github.com/mkaramihalev");
    			add_location(a0, file, 155, 19, 5324);
    			add_location(p9, file, 155, 2, 5307);
    			attr_dev(a1, "href", "https://github.com/StoyoKaramihalev/ROI_annotator");
    			add_location(a1, file, 156, 12, 5404);
    			add_location(p10, file, 156, 2, 5394);
    			attr_dev(footer, "class", "svelte-1fp8hvv");
    			add_location(footer, file, 154, 0, 5296);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, hr0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(div0, t6);
    			append_dev(div0, p2);
    			append_dev(p2, input0);
    			append_dev(div4, t7);
    			append_dev(div4, div1);
    			append_dev(div1, p3);
    			append_dev(div1, t9);
    			append_dev(div1, p4);
    			append_dev(div1, t11);
    			append_dev(div1, p5);
    			append_dev(p5, input1);
    			append_dev(div4, t12);
    			append_dev(div4, p6);
    			append_dev(div4, t14);
    			append_dev(div4, p7);
    			append_dev(div4, t16);
    			append_dev(div4, p8);
    			append_dev(p8, button0);
    			append_dev(p8, t18);
    			append_dev(p8, input2);
    			set_input_value(input2, /*regions*/ ctx[4].referenceValue);
    			append_dev(div4, t19);
    			append_dev(div4, hr1);
    			append_dev(div4, t20);
    			append_dev(div4, div3);
    			append_dev(div3, button1);
    			append_dev(div3, t22);
    			append_dev(div3, button2);
    			append_dev(div3, t24);
    			append_dev(div3, button3);
    			append_dev(button3, t25);
    			append_dev(div3, t26);
    			append_dev(div3, input3);
    			set_input_value(input3, /*name*/ ctx[9]);
    			append_dev(div3, t27);
    			append_dev(div3, div2);
    			append_dev(div2, svg_1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(svg_1, null);
    			}

    			append_dev(svg_1, polyline);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg_1, null);
    			}

    			append_dev(svg_1, each1_anchor);
    			if (if_block0) if_block0.m(svg_1, null);
    			/*svg_1_binding*/ ctx[29](svg_1);
    			append_dev(div2, t28);
    			append_dev(div2, img_1);
    			/*img_1_binding*/ ctx[30](img_1);
    			append_dev(div4, t29);
    			if (if_block1) if_block1.m(div4, null);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, p9);
    			append_dev(p9, t31);
    			append_dev(p9, a0);
    			append_dev(footer, t33);
    			append_dev(footer, p10);
    			append_dev(p10, t34);
    			append_dev(p10, a1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[20]),
    					listen_dev(input1, "change", /*loadRegion*/ ctx[19], false, false, false),
    					listen_dev(button0, "click", /*click_handler*/ ctx[21], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[22]),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[23], false, false, false),
    					listen_dev(button2, "click", /*clear*/ ctx[14], false, false, false),
    					listen_dev(button3, "click", /*save*/ ctx[15], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[24]),
    					listen_dev(svg_1, "click", /*onClick*/ ctx[13], false, false, false),
    					listen_dev(img_1, "load", /*setSvgWidth*/ ctx[17], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selecting*/ 2) {
    				toggle_class(button0, "pointer", /*selecting*/ ctx[1] === "refer");
    			}

    			if (dirty[0] & /*regions*/ 16 && input2.value !== /*regions*/ ctx[4].referenceValue) {
    				set_input_value(input2, /*regions*/ ctx[4].referenceValue);
    			}

    			if (dirty[0] & /*selecting*/ 2) {
    				toggle_class(button1, "pointer", /*selecting*/ ctx[1] === "define");
    			}

    			if (dirty[0] & /*roi*/ 4 && button3_disabled_value !== (button3_disabled_value = /*roi*/ ctx[2].length < 4)) {
    				prop_dev(button3, "disabled", button3_disabled_value);
    			}

    			if (dirty[0] & /*name*/ 512 && input3.value !== /*name*/ ctx[9]) {
    				set_input_value(input3, /*name*/ ctx[9]);
    			}

    			if (dirty[0] & /*regions, r, circleMouseDown, circleMouseMove, pointify*/ 332048) {
    				each_value_1 = Object.entries(/*regions*/ ctx[4]).filter(func);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg_1, polyline);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*points*/ 2048) {
    				attr_dev(polyline, "points", /*points*/ ctx[11]);
    			}

    			if (dirty[0] & /*circles, r*/ 4104) {
    				each_value = /*circles*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg_1, each1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*regions*/ ctx[4].reference.length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(svg_1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*selecting*/ 2) {
    				toggle_class(svg_1, "pointer", /*selecting*/ ctx[1] !== "");
    			}

    			if (dirty[0] & /*imgUrl*/ 1024 && img_1.src !== (img_1_src_value = /*imgUrl*/ ctx[10])) {
    				attr_dev(img_1, "src", img_1_src_value);
    			}

    			if (dirty[0] & /*regions*/ 16) show_if = Object.keys(/*regions*/ ctx[4]).length > 0;

    			if (show_if) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div4, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(hr0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			/*svg_1_binding*/ ctx[29](null);
    			/*img_1_binding*/ ctx[30](null);
    			if (if_block1) if_block1.d();
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = ([k, v]) => v.points;

    function instance($$self, $$props, $$invalidate) {
    	let files = [];
    	let regionFiles = [];
    	let selecting = "";
    	let r = 8;
    	let currentTime = 0;
    	let roi = [];
    	let circles = [];
    	let regions = { reference: [], referenceValue: "" };
    	let regionCount = 0;
    	let svg;
    	let downloadName = "regions.json";
    	let imgEl;
    	let circleMouseDown = false;

    	const defineClick = (cx, cy) => {
    		if (circles.length > 1) {
    			let fx = circles[0].x;
    			let fy = circles[0].y;

    			if (Math.abs(cx - fx) <= r && Math.abs(cy - fy) <= r) {
    				cx = fx;
    				cy = fy;
    				$$invalidate(1, selecting = "");
    			}
    		}

    		$$invalidate(2, roi = [...roi, { x: cx, y: cy }]);
    		$$invalidate(3, circles = [...circles, { x: cx, y: cy }]);
    	};

    	const referClick = (x, y) => {
    		if (regions.reference.length >= 2) return;
    		$$invalidate(4, regions.reference = [...regions.reference, { x, y }], regions);
    	};

    	const onClick = ({ x, y }) => {
    		if (selecting === "") return;
    		let cx = x - svgPos.left;
    		let cy = y - svgPos.top;
    		if (selecting === "define") defineClick(cx, cy);
    		if (selecting === "refer") referClick(cx, cy);
    	};

    	const clear = () => {
    		$$invalidate(3, circles = []);
    		$$invalidate(2, roi = []);
    	};

    	const save = () => {
    		$$invalidate(4, regions[imgName + "_" + currentTime + $$invalidate(32, ++regionCount)] = { name, points: roi.slice() }, regions);
    		$$invalidate(2, roi = []);
    		$$invalidate(3, circles = []);
    	};

    	const pointify = r => r.map(({ x, y }) => `${x},${y}`).join(" ");

    	const setSvgWidth = () => {
    		$$invalidate(5, svg.style.width = imgEl.clientWidth, svg);
    		$$invalidate(5, svg.style.height = imgEl.clientHeight, svg);
    	};

    	const circleMouseMove = (e, index, key) => {
    		const x = e.clientX - svg.getBoundingClientRect().x;
    		const y = e.clientY - svg.getBoundingClientRect().y;
    		$$invalidate(4, regions[key].points[index] = { x, y }, regions);
    		if (index === 0) $$invalidate(4, regions[key].points[regions[key].points.length - 1] = { x, y }, regions); else if (index === regions[key].points.length - 1) $$invalidate(4, regions[key].points[0] = { x, y }, regions);
    	};

    	const loadRegion = e => {
    		if (e.target.files.length === 0) return;
    		const regionFile = e.target.files[0];
    		const reader = new FileReader();

    		reader.onload = evt => {
    			$$invalidate(4, regions = Object.assign(regions, JSON.parse(evt.target.result)));
    		};

    		reader.readAsText(regionFile);
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_change_handler() {
    		files = this.files;
    		$$invalidate(0, files);
    	}

    	const click_handler = () => $$invalidate(1, selecting = "refer");

    	function input2_input_handler() {
    		regions.referenceValue = this.value;
    		$$invalidate(4, regions);
    	}

    	const click_handler_1 = () => $$invalidate(1, selecting = "define");

    	function input3_input_handler() {
    		name = this.value;
    		($$invalidate(9, name), $$invalidate(32, regionCount));
    	}

    	const mousemove_handler = (index, key, e) => circleMouseDown && circleMouseMove(e, index, key);
    	const mousedown_handler = () => $$invalidate(8, circleMouseDown = true);
    	const mouseup_handler = () => $$invalidate(8, circleMouseDown = false);
    	const mouseleave_handler = () => $$invalidate(8, circleMouseDown = false);

    	function svg_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			svg = $$value;
    			$$invalidate(5, svg);
    		});
    	}

    	function img_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			imgEl = $$value;
    			$$invalidate(7, imgEl);
    		});
    	}

    	function input_input_handler() {
    		downloadName = this.value;
    		((($$invalidate(6, downloadName), $$invalidate(34, imgName)), $$invalidate(35, img)), $$invalidate(0, files));
    	}

    	$$self.$capture_state = () => ({
    		files,
    		regionFiles,
    		selecting,
    		r,
    		currentTime,
    		roi,
    		circles,
    		regions,
    		regionCount,
    		svg,
    		downloadName,
    		imgEl,
    		circleMouseDown,
    		defineClick,
    		referClick,
    		onClick,
    		clear,
    		save,
    		pointify,
    		setSvgWidth,
    		circleMouseMove,
    		loadRegion,
    		svgPos,
    		imgName,
    		name,
    		points,
    		img,
    		imgUrl
    	});

    	$$self.$inject_state = $$props => {
    		if ("files" in $$props) $$invalidate(0, files = $$props.files);
    		if ("regionFiles" in $$props) regionFiles = $$props.regionFiles;
    		if ("selecting" in $$props) $$invalidate(1, selecting = $$props.selecting);
    		if ("r" in $$props) $$invalidate(12, r = $$props.r);
    		if ("currentTime" in $$props) currentTime = $$props.currentTime;
    		if ("roi" in $$props) $$invalidate(2, roi = $$props.roi);
    		if ("circles" in $$props) $$invalidate(3, circles = $$props.circles);
    		if ("regions" in $$props) $$invalidate(4, regions = $$props.regions);
    		if ("regionCount" in $$props) $$invalidate(32, regionCount = $$props.regionCount);
    		if ("svg" in $$props) $$invalidate(5, svg = $$props.svg);
    		if ("downloadName" in $$props) $$invalidate(6, downloadName = $$props.downloadName);
    		if ("imgEl" in $$props) $$invalidate(7, imgEl = $$props.imgEl);
    		if ("circleMouseDown" in $$props) $$invalidate(8, circleMouseDown = $$props.circleMouseDown);
    		if ("svgPos" in $$props) svgPos = $$props.svgPos;
    		if ("imgName" in $$props) $$invalidate(34, imgName = $$props.imgName);
    		if ("name" in $$props) $$invalidate(9, name = $$props.name);
    		if ("points" in $$props) $$invalidate(11, points = $$props.points);
    		if ("img" in $$props) $$invalidate(35, img = $$props.img);
    		if ("imgUrl" in $$props) $$invalidate(10, imgUrl = $$props.imgUrl);
    	};

    	let svgPos;
    	let points;
    	let img;
    	let imgUrl;
    	let imgName;
    	let name;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*svg*/ 32) {
    			 svgPos = svg && {
    				left: svg.getBoundingClientRect().x,
    				top: svg.getBoundingClientRect().y
    			};
    		}

    		if ($$self.$$.dirty[0] & /*roi*/ 4) {
    			 $$invalidate(11, points = pointify(roi));
    		}

    		if ($$self.$$.dirty[0] & /*files*/ 1) {
    			 $$invalidate(35, img = files.length > 0 ? files[0] : null);
    		}

    		if ($$self.$$.dirty[1] & /*img*/ 16) {
    			 $$invalidate(10, imgUrl = img ? URL.createObjectURL(img) : "");
    		}

    		if ($$self.$$.dirty[1] & /*img*/ 16) {
    			 $$invalidate(34, imgName = img ? img.name : "unknown");
    		}

    		if ($$self.$$.dirty[1] & /*regionCount*/ 2) {
    			 $$invalidate(9, name = "region_" + regionCount);
    		}

    		if ($$self.$$.dirty[1] & /*imgName*/ 8) {
    			 $$invalidate(6, downloadName = imgName + ".json");
    		}
    	};

    	return [
    		files,
    		selecting,
    		roi,
    		circles,
    		regions,
    		svg,
    		downloadName,
    		imgEl,
    		circleMouseDown,
    		name,
    		imgUrl,
    		points,
    		r,
    		onClick,
    		clear,
    		save,
    		pointify,
    		setSvgWidth,
    		circleMouseMove,
    		loadRegion,
    		input0_change_handler,
    		click_handler,
    		input2_input_handler,
    		click_handler_1,
    		input3_input_handler,
    		mousemove_handler,
    		mousedown_handler,
    		mouseup_handler,
    		mouseleave_handler,
    		svg_1_binding,
    		img_1_binding,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {},
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }

    return app;

}());
//# sourceMappingURL=bundle.js.map
