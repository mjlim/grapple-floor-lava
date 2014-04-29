require.config({
		baseUrl: 'scripts/',
		// ...
		packages: [
			{
				name: 'physicsjs',
				location: 'physicsjs',
				main: 'physicsjs-0.6.0.min'
			}
		],
		// ...
});

require([
		'physicsjs',
		'physicsjs/renderers/canvas',
		'physicsjs/behaviors/edge-collision-detection',
		'physicsjs/behaviors/body-impulse-response',
		'physicsjs/behaviors/constant-acceleration',
		'physicsjs/behaviors/body-collision-detection',
		'physicsjs/behaviors/verlet-constraints',
		'physicsjs/behaviors/sweep-prune',
		'physicsjs/behaviors/interactive',
		'physicsjs/bodies/circle', // circle
		'physicsjs/bodies/rectangle' // rectangle
	], function( Physics ) {
		// do something with the circles
		//
	Physics(function(world){
		var viewWidth = 1024;
		var viewHeight = 1024;

		var renderer = Physics.renderer('canvas', {
				el: 'viewport',
				width: viewWidth,
				height: viewHeight,
				meta: false,
				styles: {
					// set colors for the circle bodies
					'circle' : {
						strokeStyle: '#351024',
						lineWidth: 1,
						fillStyle: '#d33682',
						angleIndicator: '#351024'
					}
				}
		});

		var ropeStyles = {
			strokeStyle: '#FF0000',
			lineWidth: 1
		};

		// add renderer
		world.add(renderer);

		// render each step
		world.on('step', function(){
			world.render();
		});

		// bounds of the window
		var viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight);

		// constrain object to viewport bounds
		world.add(Physics.behavior('edge-collision-detection', {
					aabb: viewportBounds,
					restitution: 0.3,
					cof: 0.99
		}));

		// add a circle
		var ball = Physics.body('circle', {
				x: 50,
				y: 30,
				vx: 0.2,
				vy: 0.01,
				radius: 20
		});

		var attach = Physics.body('circle', {
				x: 170,
				y: 120,
				radius: 5,
				treatment: 'static'
		});

		world.add(ball);
		world.add(attach);

		var platform = Physics.body('rectangle', {
				x: 350,
				y: 100,
				width:400,
				height:15,
				treatment: 'static'
		});

		var rope = Physics.body('rectangle', {
				x: 100,
				y: 50,
				width: 50,
				height: 5
		});

		world.add(rope);
		world.add(platform);

		var constr = Physics.behavior('verlet-constraints');
		//var c = constr.angleConstraint(ball, platform, rope, 0.6)
		//var d = constr.distanceConstraint(rope, platform, 0.9, 200)
		var e = constr.distanceConstraint(ball, attach, 0, 100)

		world.add(constr)

		// ensure objects bounce when edge collision detected
		world.add(Physics.behavior('body-impulse-response') );

		world.add(Physics.behavior('body-collision-detection'));
		world.add(Physics.behavior('sweep-prune'));

		// add some gravity
		world.add(Physics.behavior('constant-acceleration') );

		// allow interaction
		world.add(Physics.behavior('interactive', {el: renderer.el}));

        var handlekey = function handlekey(evt){
            //console.log(evt);
            //console.log(e);
            switch(evt.keyCode)
            {
                case 119: // w (up)
                case 87:
                    resizerope(e, -10);
                    break;
                case 115: // s (down)
                case 83:
                    resizerope(e, 10);
                    break;
            }

            console.log(e.targetLength);
        }

		document.addEventListener('keypress', handlekey, false)

		function shootrope(pos){
			vpos = Physics.vector(pos)
			console.log("a");
			constr.remove(e);
			console.log("b");
			attach.state.pos = vpos;
			console.log("c");
			console.log(ball.state.pos)
			console.log(attach.state.pos)
			dist = ball.state.pos.dist(attach.state.pos);
			console.log("d");
			console.log(dist);
			e = constr.distanceConstraint(ball, attach, 0, dist);
		}

		function resizerope(rope, diff){ // remove and recreate distance constraint with different size
		    a = rope.bodyA;
		    b = rope.bodyB;
		    len = rope.targetLength + diff;
		    if(len < 0){
		        len = 0;
            }
		    constr.remove(rope);
		    e = constr.distanceConstraint(a, b, 0, len); // todo: don't reference e here. rework data structures to make sense.
        }


		// clicks
		world.on({
				'interact:poke': function(pos){
					shootrope(pos);
				}
		});
		// lines for rope
		world.on('render-rope', function (ctx){
			/* the below is basically copied from the tree demo. not useful right now, keeping for later
			var constrs = ball.constraints.getConstraints().distanceConstraints,c;
			for (var i = 0, l = constrs.length; i<l; ++i){
				c = constrs[i];
				renderer.drawLine(c.bodyA.state.pos, c.bodyB.state.pos, ropeStyles, ctx);
			}
			*/
			renderer.drawLine(ball.state.pos, attach.state.pos, ropeStyles, ctx);
		});

		renderer.addLayer('ropes', null, { zIndex:0 }).render = function(){
			this.ctx.clearRect(0, 0, this.el.width, this.el.height);
			world.emit('render-rope', this.ctx);
		};

		// subscribe to ticker to advance the simulation
		Physics.util.ticker.on(function(time,dt){
			world.step(time);

			renderer.drawLine(ball.state.pos, attach.state.pos, { strokeStyle: "#FF0000" });
		});

		// start the ticker
		Physics.util.ticker.start();

	});
});
