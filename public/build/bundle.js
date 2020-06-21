
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

    const is_client = typeof window !== 'undefined';
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

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
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
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
        if (text.data === data)
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

    /* src\App.svelte generated by Svelte v3.23.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i].x;
    	child_ctx[33] = list[i].y;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i].name;
    	child_ctx[12] = list[i].points;
    	return child_ctx;
    }

    // (73:6) {#each Object.values(regions) as {name: rname, points}}
    function create_each_block_1(ctx) {
    	let text_1;
    	let t_value = /*rname*/ ctx[36] + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;
    	let polyline;
    	let polyline_points_value;

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			polyline = svg_element("polyline");
    			attr_dev(text_1, "x", text_1_x_value = /*points*/ ctx[12][0].x);
    			attr_dev(text_1, "y", text_1_y_value = /*points*/ ctx[12][0].y - 5);
    			attr_dev(text_1, "fill", "white");
    			add_location(text_1, file, 73, 8, 2139);
    			attr_dev(polyline, "points", polyline_points_value = /*pointify*/ ctx[17](/*points*/ ctx[12]));
    			attr_dev(polyline, "fill", "none");
    			attr_dev(polyline, "stroke", "darkgreen");
    			attr_dev(polyline, "stroke-width", "2");
    			add_location(polyline, file, 74, 8, 2218);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    			insert_dev(target, polyline, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*regions*/ 64 && t_value !== (t_value = /*rname*/ ctx[36] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*regions*/ 64 && text_1_x_value !== (text_1_x_value = /*points*/ ctx[12][0].x)) {
    				attr_dev(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*regions*/ 64 && text_1_y_value !== (text_1_y_value = /*points*/ ctx[12][0].y - 5)) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}

    			if (dirty[0] & /*regions*/ 64 && polyline_points_value !== (polyline_points_value = /*pointify*/ ctx[17](/*points*/ ctx[12]))) {
    				attr_dev(polyline, "points", polyline_points_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    			if (detaching) detach_dev(polyline);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(73:6) {#each Object.values(regions) as {name: rname, points}}",
    		ctx
    	});

    	return block;
    }

    // (78:6) {#each circles as {x, y}}
    function create_each_block(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", circle_cx_value = /*x*/ ctx[32]);
    			attr_dev(circle, "cy", circle_cy_value = /*y*/ ctx[33]);
    			attr_dev(circle, "r", /*r*/ ctx[13]);
    			attr_dev(circle, "fill", "lightblue");
    			add_location(circle, file, 78, 8, 2462);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*circles*/ 32 && circle_cx_value !== (circle_cx_value = /*x*/ ctx[32])) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*circles*/ 32 && circle_cy_value !== (circle_cy_value = /*y*/ ctx[33])) {
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
    		source: "(78:6) {#each circles as {x, y}}",
    		ctx
    	});

    	return block;
    }

    // (85:2) {#if Object.keys(regions).length > 0}
    function create_if_block(ctx) {
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
    			p = element("p");
    			a = element("a");
    			t0 = text("Download regions");
    			t1 = space();
    			input = element("input");
    			attr_dev(a, "download", /*downloadName*/ ctx[8]);
    			attr_dev(a, "href", a_href_value = `data:application/json,${JSON.stringify(/*regions*/ ctx[6], null, 4)}`);
    			add_location(a, file, 86, 4, 2708);
    			add_location(input, file, 87, 4, 2828);
    			add_location(p, file, 85, 2, 2699);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, a);
    			append_dev(a, t0);
    			append_dev(p, t1);
    			append_dev(p, input);
    			set_input_value(input, /*downloadName*/ ctx[8]);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[27]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*downloadName*/ 256) {
    				attr_dev(a, "download", /*downloadName*/ ctx[8]);
    			}

    			if (dirty[0] & /*regions*/ 64 && a_href_value !== (a_href_value = `data:application/json,${JSON.stringify(/*regions*/ ctx[6], null, 4)}`)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*downloadName*/ 256 && input.value !== /*downloadName*/ ctx[8]) {
    				set_input_value(input, /*downloadName*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(85:2) {#if Object.keys(regions).length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let header;
    	let h1;
    	let t1;
    	let main;
    	let p0;
    	let t2;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let button0;
    	let t6;
    	let button1;
    	let t8;
    	let button2;
    	let t9;
    	let button2_disabled_value;
    	let t10;
    	let input2;
    	let t11;
    	let div;
    	let svg_1;
    	let polyline;
    	let t12;
    	let video_1;
    	let video_1_src_value;
    	let video_1_updating = false;
    	let video_1_animationframe;
    	let t13;
    	let show_if = Object.keys(/*regions*/ ctx[6]).length > 0;
    	let t14;
    	let footer;
    	let p1;
    	let t15;
    	let a0;
    	let t17;
    	let p2;
    	let a1;
    	let t19;
    	let mounted;
    	let dispose;
    	let each_value_1 = Object.values(/*regions*/ ctx[6]);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*circles*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function video_1_timeupdate_handler() {
    		cancelAnimationFrame(video_1_animationframe);

    		if (!video_1.paused) {
    			video_1_animationframe = raf(video_1_timeupdate_handler);
    			video_1_updating = true;
    		}

    		/*video_1_timeupdate_handler*/ ctx[25].call(video_1);
    	}

    	let if_block = show_if && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "ROI annotator";
    			t1 = space();
    			main = element("main");
    			p0 = element("p");
    			t2 = text("Select video: ");
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "Define ROI";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Clear ROI";
    			t8 = space();
    			button2 = element("button");
    			t9 = text("Save ROI");
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			div = element("div");
    			svg_1 = svg_element("svg");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			polyline = svg_element("polyline");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t12 = space();
    			video_1 = element("video");
    			t13 = space();
    			if (if_block) if_block.c();
    			t14 = space();
    			footer = element("footer");
    			p1 = element("p");
    			t15 = text("Developed by: ");
    			a0 = element("a");
    			a0.textContent = "Marin Karamihalev";
    			t17 = space();
    			p2 = element("p");
    			a1 = element("a");
    			a1.textContent = "Repository";
    			t19 = text(" on GitHub");
    			add_location(h1, file, 59, 2, 1504);
    			attr_dev(header, "class", "svelte-kn3dh2");
    			add_location(header, file, 58, 0, 1492);
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "accept", "video/*");
    			add_location(input0, file, 63, 18, 1567);
    			add_location(p0, file, 63, 1, 1550);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", /*duration*/ ctx[2]);
    			attr_dev(input1, "step", "0.1");
    			add_location(input1, file, 64, 2, 1622);
    			attr_dev(button0, "class", "svelte-kn3dh2");
    			toggle_class(button0, "pointer", /*selecting*/ ctx[1]);
    			add_location(button0, file, 65, 2, 1707);
    			add_location(button1, file, 66, 2, 1798);
    			button2.disabled = button2_disabled_value = /*roi*/ ctx[4].length < 4;
    			add_location(button2, file, 67, 2, 1845);
    			input2.required = true;
    			attr_dev(input2, "minlength", "1");
    			add_location(input2, file, 68, 2, 1916);
    			attr_dev(polyline, "points", /*points*/ ctx[12]);
    			attr_dev(polyline, "fill", "none");
    			attr_dev(polyline, "stroke", "lightblue");
    			attr_dev(polyline, "stroke-width", "2");
    			attr_dev(polyline, "stroke-dasharray", "10,10");
    			add_location(polyline, file, 76, 6, 2326);
    			attr_dev(svg_1, "class", "svelte-kn3dh2");
    			toggle_class(svg_1, "pointer", /*selecting*/ ctx[1]);
    			add_location(svg_1, file, 71, 4, 2000);
    			if (video_1.src !== (video_1_src_value = /*videoUrl*/ ctx[11])) attr_dev(video_1, "src", video_1_src_value);
    			attr_dev(video_1, "class", "svelte-kn3dh2");
    			if (/*duration*/ ctx[2] === void 0) add_render_callback(() => /*video_1_durationchange_handler*/ ctx[26].call(video_1));
    			add_location(video_1, file, 81, 4, 2539);
    			attr_dev(div, "class", "container svelte-kn3dh2");
    			add_location(div, file, 70, 2, 1971);
    			attr_dev(main, "class", "svelte-kn3dh2");
    			add_location(main, file, 62, 0, 1541);
    			attr_dev(a0, "href", "https://github.com/mkaramihalev");
    			add_location(a0, file, 94, 19, 2923);
    			add_location(p1, file, 94, 2, 2906);
    			attr_dev(a1, "href", "https://github.com/StoyoKaramihalev/ROI_annotator");
    			add_location(a1, file, 95, 5, 2997);
    			add_location(p2, file, 95, 2, 2994);
    			add_location(footer, file, 93, 0, 2894);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, p0);
    			append_dev(p0, t2);
    			append_dev(p0, input0);
    			append_dev(main, t3);
    			append_dev(main, input1);
    			set_input_value(input1, /*currentTime*/ ctx[3]);
    			append_dev(main, t4);
    			append_dev(main, button0);
    			append_dev(main, t6);
    			append_dev(main, button1);
    			append_dev(main, t8);
    			append_dev(main, button2);
    			append_dev(button2, t9);
    			append_dev(main, t10);
    			append_dev(main, input2);
    			set_input_value(input2, /*name*/ ctx[10]);
    			append_dev(main, t11);
    			append_dev(main, div);
    			append_dev(div, svg_1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(svg_1, null);
    			}

    			append_dev(svg_1, polyline);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg_1, null);
    			}

    			/*svg_1_binding*/ ctx[23](svg_1);
    			append_dev(div, t12);
    			append_dev(div, video_1);
    			/*video_1_binding*/ ctx[24](video_1);
    			append_dev(main, t13);
    			if (if_block) if_block.m(main, null);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, p1);
    			append_dev(p1, t15);
    			append_dev(p1, a0);
    			append_dev(footer, t17);
    			append_dev(footer, p2);
    			append_dev(p2, a1);
    			append_dev(p2, t19);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[19]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[20]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[20]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[21], false, false, false),
    					listen_dev(button1, "click", /*clear*/ ctx[15], false, false, false),
    					listen_dev(button2, "click", /*save*/ ctx[16], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[22]),
    					listen_dev(svg_1, "click", /*onClick*/ ctx[14], false, false, false),
    					listen_dev(video_1, "loadeddata", /*setSvgWidth*/ ctx[18], false, false, false),
    					listen_dev(video_1, "timeupdate", video_1_timeupdate_handler),
    					listen_dev(video_1, "durationchange", /*video_1_durationchange_handler*/ ctx[26])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*duration*/ 4) {
    				attr_dev(input1, "max", /*duration*/ ctx[2]);
    			}

    			if (dirty[0] & /*currentTime*/ 8) {
    				set_input_value(input1, /*currentTime*/ ctx[3]);
    			}

    			if (dirty[0] & /*selecting*/ 2) {
    				toggle_class(button0, "pointer", /*selecting*/ ctx[1]);
    			}

    			if (dirty[0] & /*roi*/ 16 && button2_disabled_value !== (button2_disabled_value = /*roi*/ ctx[4].length < 4)) {
    				prop_dev(button2, "disabled", button2_disabled_value);
    			}

    			if (dirty[0] & /*name*/ 1024 && input2.value !== /*name*/ ctx[10]) {
    				set_input_value(input2, /*name*/ ctx[10]);
    			}

    			if (dirty[0] & /*pointify, regions*/ 131136) {
    				each_value_1 = Object.values(/*regions*/ ctx[6]);
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

    			if (dirty[0] & /*points*/ 4096) {
    				attr_dev(polyline, "points", /*points*/ ctx[12]);
    			}

    			if (dirty[0] & /*circles, r*/ 8224) {
    				each_value = /*circles*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg_1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*selecting*/ 2) {
    				toggle_class(svg_1, "pointer", /*selecting*/ ctx[1]);
    			}

    			if (dirty[0] & /*videoUrl*/ 2048 && video_1.src !== (video_1_src_value = /*videoUrl*/ ctx[11])) {
    				attr_dev(video_1, "src", video_1_src_value);
    			}

    			if (!video_1_updating && dirty[0] & /*currentTime*/ 8 && !isNaN(/*currentTime*/ ctx[3])) {
    				video_1.currentTime = /*currentTime*/ ctx[3];
    			}

    			video_1_updating = false;
    			if (dirty[0] & /*regions*/ 64) show_if = Object.keys(/*regions*/ ctx[6]).length > 0;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			/*svg_1_binding*/ ctx[23](null);
    			/*video_1_binding*/ ctx[24](null);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t14);
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

    function instance($$self, $$props, $$invalidate) {
    	let files = [];
    	let selecting = false;
    	let duration = 5;
    	let r = 5;
    	let currentTime = 0;
    	let roi = [];
    	let circles = [];
    	let regions = {};
    	let regionCount = 0;
    	let svg;
    	let downloadName = "regions.json";
    	let videoEl;

    	const onClick = ({ x, y }) => {
    		if (!selecting) return; //do nothing if not selecting
    		let cx = x - svgPos.left;
    		let cy = y - svgPos.top;
    		console.log({ cx, cy });

    		if (circles.length > 1) {
    			let fx = circles[0].x;
    			let fy = circles[0].y;

    			if (Math.abs(cx - fx) <= r && Math.abs(cy - fy) <= r) {
    				cx = fx;
    				cy = fy;
    				$$invalidate(1, selecting = false);
    			}
    		}

    		$$invalidate(4, roi = [...roi, { x: cx, y: cy }]);
    		$$invalidate(5, circles = [...circles, { x: cx, y: cy }]);
    	};

    	const clear = () => {
    		$$invalidate(5, circles = []);
    		$$invalidate(4, roi = []);
    	};

    	const save = () => {
    		$$invalidate(6, regions[videoName + "_" + currentTime + $$invalidate(28, ++regionCount)] = { name, points: roi.slice() }, regions);
    		$$invalidate(4, roi = []);
    		$$invalidate(5, circles = []);
    	};

    	const pointify = r => r.map(({ x, y }) => `${x},${y}`).join(" ");

    	const setSvgWidth = () => {
    		$$invalidate(7, svg.style.width = videoEl.clientWidth, svg);
    		$$invalidate(7, svg.style.height = videoEl.clientHeight, svg);
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_change_handler() {
    		files = this.files;
    		$$invalidate(0, files);
    	}

    	function input1_change_input_handler() {
    		currentTime = to_number(this.value);
    		$$invalidate(3, currentTime);
    	}

    	const click_handler = () => $$invalidate(1, selecting = true);

    	function input2_input_handler() {
    		name = this.value;
    		($$invalidate(10, name), $$invalidate(28, regionCount));
    	}

    	function svg_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			svg = $$value;
    			$$invalidate(7, svg);
    		});
    	}

    	function video_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			videoEl = $$value;
    			$$invalidate(9, videoEl);
    		});
    	}

    	function video_1_timeupdate_handler() {
    		currentTime = this.currentTime;
    		$$invalidate(3, currentTime);
    	}

    	function video_1_durationchange_handler() {
    		duration = this.duration;
    		$$invalidate(2, duration);
    	}

    	function input_input_handler() {
    		downloadName = this.value;
    		$$invalidate(8, downloadName);
    	}

    	$$self.$capture_state = () => ({
    		files,
    		selecting,
    		duration,
    		r,
    		currentTime,
    		roi,
    		circles,
    		regions,
    		regionCount,
    		svg,
    		downloadName,
    		videoEl,
    		onClick,
    		clear,
    		save,
    		pointify,
    		setSvgWidth,
    		svgPos,
    		videoName,
    		name,
    		points,
    		video,
    		videoUrl
    	});

    	$$self.$inject_state = $$props => {
    		if ("files" in $$props) $$invalidate(0, files = $$props.files);
    		if ("selecting" in $$props) $$invalidate(1, selecting = $$props.selecting);
    		if ("duration" in $$props) $$invalidate(2, duration = $$props.duration);
    		if ("r" in $$props) $$invalidate(13, r = $$props.r);
    		if ("currentTime" in $$props) $$invalidate(3, currentTime = $$props.currentTime);
    		if ("roi" in $$props) $$invalidate(4, roi = $$props.roi);
    		if ("circles" in $$props) $$invalidate(5, circles = $$props.circles);
    		if ("regions" in $$props) $$invalidate(6, regions = $$props.regions);
    		if ("regionCount" in $$props) $$invalidate(28, regionCount = $$props.regionCount);
    		if ("svg" in $$props) $$invalidate(7, svg = $$props.svg);
    		if ("downloadName" in $$props) $$invalidate(8, downloadName = $$props.downloadName);
    		if ("videoEl" in $$props) $$invalidate(9, videoEl = $$props.videoEl);
    		if ("svgPos" in $$props) svgPos = $$props.svgPos;
    		if ("videoName" in $$props) videoName = $$props.videoName;
    		if ("name" in $$props) $$invalidate(10, name = $$props.name);
    		if ("points" in $$props) $$invalidate(12, points = $$props.points);
    		if ("video" in $$props) $$invalidate(31, video = $$props.video);
    		if ("videoUrl" in $$props) $$invalidate(11, videoUrl = $$props.videoUrl);
    	};

    	let svgPos;
    	let points;
    	let video;
    	let videoUrl;
    	let videoName;
    	let name;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*svg*/ 128) {
    			 svgPos = svg && {
    				left: svg.getBoundingClientRect().x,
    				top: svg.getBoundingClientRect().y
    			};
    		}

    		if ($$self.$$.dirty[0] & /*roi*/ 16) {
    			 $$invalidate(12, points = pointify(roi));
    		}

    		if ($$self.$$.dirty[0] & /*files*/ 1) {
    			 $$invalidate(31, video = files.length > 0 ? files[0] : null);
    		}

    		if ($$self.$$.dirty[1] & /*video*/ 1) {
    			 $$invalidate(11, videoUrl = video ? URL.createObjectURL(video) : "");
    		}

    		if ($$self.$$.dirty[1] & /*video*/ 1) {
    			 videoName = video ? video.name : "unknown";
    		}

    		if ($$self.$$.dirty[0] & /*regionCount*/ 268435456) {
    			 $$invalidate(10, name = "region_" + regionCount);
    		}
    	};

    	return [
    		files,
    		selecting,
    		duration,
    		currentTime,
    		roi,
    		circles,
    		regions,
    		svg,
    		downloadName,
    		videoEl,
    		name,
    		videoUrl,
    		points,
    		r,
    		onClick,
    		clear,
    		save,
    		pointify,
    		setSvgWidth,
    		input0_change_handler,
    		input1_change_input_handler,
    		click_handler,
    		input2_input_handler,
    		svg_1_binding,
    		video_1_binding,
    		video_1_timeupdate_handler,
    		video_1_durationchange_handler,
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
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
