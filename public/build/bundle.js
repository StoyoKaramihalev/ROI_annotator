
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

    /* src/App.svelte generated by Svelte v3.23.2 */

    const { Object: Object_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i].x;
    	child_ctx[30] = list[i].y;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (63:6) {#each Object.values(regions) as r}
    function create_each_block_2(ctx) {
    	let polyline;
    	let polyline_points_value;

    	const block = {
    		c: function create() {
    			polyline = svg_element("polyline");
    			attr_dev(polyline, "points", polyline_points_value = /*r*/ ctx[13].map(func).join(" "));
    			attr_dev(polyline, "fill", "none");
    			attr_dev(polyline, "stroke", "red");
    			attr_dev(polyline, "stroke-width", "2");
    			add_location(polyline, file, 63, 8, 1686);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polyline, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*regions*/ 64 && polyline_points_value !== (polyline_points_value = /*r*/ ctx[13].map(func).join(" "))) {
    				attr_dev(polyline, "points", polyline_points_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polyline);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(63:6) {#each Object.values(regions) as r}",
    		ctx
    	});

    	return block;
    }

    // (67:6) {#each circles as {x, y}}
    function create_each_block_1(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", circle_cx_value = /*x*/ ctx[29]);
    			attr_dev(circle, "cy", circle_cy_value = /*y*/ ctx[30]);
    			attr_dev(circle, "r", /*r*/ ctx[13]);
    			attr_dev(circle, "fill", "white");
    			add_location(circle, file, 67, 8, 1940);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*circles*/ 32 && circle_cx_value !== (circle_cx_value = /*x*/ ctx[29])) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*circles*/ 32 && circle_cy_value !== (circle_cy_value = /*y*/ ctx[30])) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(67:6) {#each circles as {x, y}}",
    		ctx
    	});

    	return block;
    }

    // (74:2) {#each Object.keys(regions) as region}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*region*/ ctx[26] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file, 74, 4, 2127);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*regions*/ 64 && t_value !== (t_value = /*region*/ ctx[26] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(74:2) {#each Object.keys(regions) as region}",
    		ctx
    	});

    	return block;
    }

    // (78:2) {#if Object.keys(regions).length > 0}
    function create_if_block(ctx) {
    	let a;
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("Download regions");
    			attr_dev(a, "download", "regions.json");
    			attr_dev(a, "href", a_href_value = `data:application/json,${JSON.stringify(/*regions*/ ctx[6], null, 2)}`);
    			add_location(a, file, 78, 2, 2205);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*regions*/ 64 && a_href_value !== (a_href_value = `data:application/json,${JSON.stringify(/*regions*/ ctx[6], null, 2)}`)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(78:2) {#if Object.keys(regions).length > 0}",
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
    	let div;
    	let svg_1;
    	let polyline;
    	let t11;
    	let video_1;
    	let video_1_src_value;
    	let video_1_updating = false;
    	let video_1_animationframe;
    	let t12;
    	let ul;
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
    	let each_value_2 = Object.values(/*regions*/ ctx[6]);
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*circles*/ ctx[5];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function video_1_timeupdate_handler() {
    		cancelAnimationFrame(video_1_animationframe);

    		if (!video_1.paused) {
    			video_1_animationframe = raf(video_1_timeupdate_handler);
    			video_1_updating = true;
    		}

    		/*video_1_timeupdate_handler*/ ctx[18].call(video_1);
    	}

    	let each_value = Object.keys(/*regions*/ ctx[6]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			div = element("div");
    			svg_1 = svg_element("svg");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			polyline = svg_element("polyline");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t11 = space();
    			video_1 = element("video");
    			t12 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

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
    			add_location(h1, file, 51, 2, 1164);
    			attr_dev(header, "class", "svelte-1b2hj28");
    			add_location(header, file, 50, 0, 1153);
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "accept", "video/*");
    			add_location(input0, file, 55, 18, 1249);
    			add_location(p0, file, 55, 1, 1232);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", /*duration*/ ctx[2]);
    			attr_dev(input1, "step", "0.1");
    			add_location(input1, file, 56, 2, 1303);
    			add_location(button0, file, 57, 2, 1387);
    			add_location(button1, file, 58, 2, 1451);
    			button2.disabled = button2_disabled_value = /*roi*/ ctx[4].length < 4;
    			add_location(button2, file, 59, 2, 1497);
    			attr_dev(polyline, "points", /*points*/ ctx[8]);
    			attr_dev(polyline, "fill", "none");
    			attr_dev(polyline, "stroke", "white");
    			attr_dev(polyline, "stroke-width", "2");
    			attr_dev(polyline, "stroke-dasharray", "10,10");
    			add_location(polyline, file, 65, 6, 1810);
    			attr_dev(svg_1, "class", "svelte-1b2hj28");
    			add_location(svg_1, file, 61, 4, 1614);
    			if (video_1.src !== (video_1_src_value = /*videoUrl*/ ctx[9])) attr_dev(video_1, "src", video_1_src_value);
    			attr_dev(video_1, "class", "svelte-1b2hj28");
    			if (/*duration*/ ctx[2] === void 0) add_render_callback(() => /*video_1_durationchange_handler*/ ctx[19].call(video_1));
    			add_location(video_1, file, 70, 4, 2010);
    			attr_dev(div, "class", "container svelte-1b2hj28");
    			add_location(div, file, 60, 2, 1567);
    			add_location(ul, file, 72, 2, 2077);
    			attr_dev(main, "class", "svelte-1b2hj28");
    			toggle_class(main, "pointer", /*selecting*/ ctx[1]);
    			add_location(main, file, 54, 0, 1198);
    			attr_dev(a0, "href", "https://github.com/mkaramihalev");
    			add_location(a0, file, 84, 19, 2369);
    			add_location(p1, file, 84, 2, 2352);
    			attr_dev(a1, "href", "https://github.com/mkaramihalev/stoyo-roi");
    			add_location(a1, file, 85, 5, 2442);
    			add_location(p2, file, 85, 2, 2439);
    			add_location(footer, file, 83, 0, 2341);
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
    			append_dev(main, div);
    			append_dev(div, svg_1);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(svg_1, null);
    			}

    			append_dev(svg_1, polyline);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(svg_1, null);
    			}

    			/*svg_1_binding*/ ctx[17](svg_1);
    			append_dev(div, t11);
    			append_dev(div, video_1);
    			append_dev(main, t12);
    			append_dev(main, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

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
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[14]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[15]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[15]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[16], false, false, false),
    					listen_dev(button1, "click", /*clear*/ ctx[11], false, false, false),
    					listen_dev(button2, "click", /*save*/ ctx[12], false, false, false),
    					listen_dev(video_1, "timeupdate", video_1_timeupdate_handler),
    					listen_dev(video_1, "durationchange", /*video_1_durationchange_handler*/ ctx[19]),
    					listen_dev(div, "click", /*onClick*/ ctx[10], false, false, false)
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

    			if (dirty[0] & /*roi*/ 16 && button2_disabled_value !== (button2_disabled_value = /*roi*/ ctx[4].length < 4)) {
    				prop_dev(button2, "disabled", button2_disabled_value);
    			}

    			if (dirty[0] & /*regions*/ 64) {
    				each_value_2 = Object.values(/*regions*/ ctx[6]);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(svg_1, polyline);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*points*/ 256) {
    				attr_dev(polyline, "points", /*points*/ ctx[8]);
    			}

    			if (dirty[0] & /*circles, r*/ 8224) {
    				each_value_1 = /*circles*/ ctx[5];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg_1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*videoUrl*/ 512 && video_1.src !== (video_1_src_value = /*videoUrl*/ ctx[9])) {
    				attr_dev(video_1, "src", video_1_src_value);
    			}

    			if (!video_1_updating && dirty[0] & /*currentTime*/ 8 && !isNaN(/*currentTime*/ ctx[3])) {
    				video_1.currentTime = /*currentTime*/ ctx[3];
    			}

    			video_1_updating = false;

    			if (dirty[0] & /*regions*/ 64) {
    				each_value = Object.keys(/*regions*/ ctx[6]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

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

    			if (dirty[0] & /*selecting*/ 2) {
    				toggle_class(main, "pointer", /*selecting*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			/*svg_1_binding*/ ctx[17](null);
    			destroy_each(each_blocks, detaching);
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

    const func = ({ x, y }) => `${x},${y}`;

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
    	let width = 600;
    	let height = 400;
    	let svg;

    	const onClick = ({ x, y }) => {
    		if (!selecting) return;
    		let cx = x - svgPos.left;
    		let cy = y - svgPos.top;

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
    		$$invalidate(6, regions[videoName + "_" + currentTime + ++regionCount] = roi.slice(), regions);
    		$$invalidate(4, roi = []);
    		$$invalidate(5, circles = []);
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

    	function input1_change_input_handler() {
    		currentTime = to_number(this.value);
    		$$invalidate(3, currentTime);
    	}

    	const click_handler = () => $$invalidate(1, selecting = true);

    	function svg_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			svg = $$value;
    			$$invalidate(7, svg);
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
    		width,
    		height,
    		svg,
    		onClick,
    		clear,
    		save,
    		svgPos,
    		videoName,
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
    		if ("regionCount" in $$props) regionCount = $$props.regionCount;
    		if ("width" in $$props) width = $$props.width;
    		if ("height" in $$props) height = $$props.height;
    		if ("svg" in $$props) $$invalidate(7, svg = $$props.svg);
    		if ("svgPos" in $$props) svgPos = $$props.svgPos;
    		if ("videoName" in $$props) videoName = $$props.videoName;
    		if ("points" in $$props) $$invalidate(8, points = $$props.points);
    		if ("video" in $$props) $$invalidate(23, video = $$props.video);
    		if ("videoUrl" in $$props) $$invalidate(9, videoUrl = $$props.videoUrl);
    	};

    	let svgPos;
    	let points;
    	let video;
    	let videoUrl;
    	let videoName;

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
    			 $$invalidate(8, points = roi.map(({ x, y }) => `${x},${y}`).join(" "));
    		}

    		if ($$self.$$.dirty[0] & /*files*/ 1) {
    			 $$invalidate(23, video = files.length > 0 ? files[0] : null);
    		}

    		if ($$self.$$.dirty[0] & /*video*/ 8388608) {
    			 $$invalidate(9, videoUrl = video ? URL.createObjectURL(video) : "");
    		}

    		if ($$self.$$.dirty[0] & /*video*/ 8388608) {
    			 videoName = video ? video.name : "unknown";
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
    		points,
    		videoUrl,
    		onClick,
    		clear,
    		save,
    		r,
    		input0_change_handler,
    		input1_change_input_handler,
    		click_handler,
    		svg_1_binding,
    		video_1_timeupdate_handler,
    		video_1_durationchange_handler
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
