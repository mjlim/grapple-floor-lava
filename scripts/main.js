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
				y: 60,
				vx: 0.2,
				vy: 0.01,
				radius: 20,
			    label: 'player'
		});

		var attach = Physics.body('circle', {
				x: 170,
				y: 120,
				radius: 5,
				treatment: 'static'
		});
		
		var bullet = [];

		world.add(ball);
		world.add(attach);

		var platform = Physics.body('rectangle', {
				x: 350,
				y: 100,
				width:400,
				height:15,
				treatment: 'static'
		});
		var platformtwo = Physics.body('rectangle', {
				x: 700,
				y: 400,
				width:300,
				height:100,
				treatment: 'static'
		});

		world.add(platform);
		world.add(platformtwo);

		var constr = Physics.behavior('verlet-constraints');
		//var c = constr.angleConstraint(ball, platform, rope, 0.6)
		//var d = constr.distanceConstraint(rope, platform, 0.9, 200)
		var e = constr.distanceConstraint(ball, attach, 0, 100)

		world.add(constr)

		// ensure objects bounce when edge collision detected
		world.add(Physics.behavior('body-impulse-response', {check: 'collisions:applyimpulse'}).applyTo([ball, platform]) );

		world.add(Physics.behavior('body-collision-detection'));
		world.add(Physics.behavior('sweep-prune'));

		// add some gravity
		world.add(Physics.behavior('constant-acceleration') );

		// allow interaction
		//world.add(Physics.behavior('interactive', {el: renderer.el}));

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
                case 65: // a (left)
                    ball.accelerate(Physics.vector(-0.001));
                    break;
                case 68: // d (right)
                    ball.accelerate(Physics.vector(0.001));
                    break;
                default:
                    //fireball();
            }

            //console.log(e.targetLength);
        }

		document.addEventListener('keydown', handlekey, false);

        function fireball(angle){
            vx = Math.sin(angle)*2;
            vy = Math.cos(angle)*-2;
            console.log("angle:" + angle + ", " + vx + " " + vy); 
            console.log(angle);
            //console.log(vx);
            //console.log(vy);
            var b = Physics.body('circle', {
                x: ball.state.pos.x,
                y: ball.state.pos.y,
                vx: vx,
                vy: vy,
                radius: 7,
                label: 'bullet'
            });
            world.add(b);
            bullet.push(b);


        }


		function shootrope(pos){ // attach rope on click
		    var relposX = pos.x - ball.state.pos.x;
		    var relposY = pos.y - ball.state.pos.y; 

		    console.log("relpos: " + relposX + ", " + relposY);
		        
			var vpos = Physics.vector(relposX, relposY);
			console.log(vpos);
			var angle = vpos.angle() + 0.5*Math.PI;
			//angle = ball.state.pos.angle(vpos);
			    
			constr.remove(e)
			fireball(angle);
			//attach.state.pos = vpos;
			//attachrope(ball,attach);
		}

		function attachrope(player, attach){
			var dist = ball.state.pos.dist(attach.state.pos);
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

        /*
        world.on('collisions:applyimpulse', function(data){
        });
        */
        world.on('collisions:hook', function(data){
            constr.remove(e);
            // bad: move rope anchor to here
            attach.state.pos = data.bullet.state.pos
            world.remove(data.bullet)
            attachrope(ball, attach);

        });
        world.on('collisions:detected', function(data){
            //console.log(data);
            var c;
            for (var i=0, l=data.collisions.length; i<l; i++){
                c = data.collisions[i];
                if (c.bodyA.label == 'bullet' || c.bodyB.label == 'bullet'){
                    var bul;
                    var obj;
                    if (c.bodyA.label == 'bullet'){
                        bul = c.bodyA;
                        obj = c.bodyB;
                    } else {
                        bul = c.bodyB;
                        obj = c.bodyA;
                    }
                    if (obj.label != 'player'){

                        console.log("bullet collision with a " + obj.label);
                        var data = {'bullet': bul, 'object': obj}
                        world.emit('collisions:hook', data)
                    }
                    else
                    {
                        console.log("collided with player")
                    }

                }
                else {
                    var d = {'collisions': [c]};
                    world.emit('collisions:applyimpulse', d);
                }
            }
        });

        var handleclick = function handleclick(e){
            console.log(e);
            var pos = getCoords(e);
            switch(e.button){
                case 0: // lmb
                    shootrope(pos);
                    break;
                case 2: // rmb
                    console.log("rmb");
                    break;
            }

        }
        renderer.el.addEventListener('mousedown', handleclick);
        //block context menu
        renderer.el.addEventListener('contextmenu', function(e){e.preventDefault();return false;});
        // helper functions for cursor pos
        var getElementOffset = function( el ){
                var curleft = 0
                    ,curtop = 0
                    ;
    
                if (el.offsetParent) {
                    do {
                        curleft += el.offsetLeft;
                        curtop += el.offsetTop;
                    } while (el = el.offsetParent);
                }
    
                return { left: curleft, top: curtop };
            }

        var getCoords = function( e ){
                var offset = getElementOffset( e.target )
                    ,obj = ( e.changedTouches && e.changedTouches[0] ) || e
                    ,x = obj.pageX - offset.left
                    ,y = obj.pageY - offset.top
                    ;
    
                return {
                    x: x
                    ,y: y
                };
        };
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

			renderer.drawLine(ball.state.pos, attach.state.pos, { strokeStyle: "#FF0000", strokeWidth:2 });
		});

		// start the ticker
		Physics.util.ticker.start();

	});
});
