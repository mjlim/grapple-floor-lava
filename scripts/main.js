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
		'gamepad',
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
	], function( Gamepad, Physics ) {
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
			strokeStyle: '#66480C',
			lineWidth: 2
		};
		var yankRopeStyles = {
			strokeStyle: '#333333',
			lineWidth: 2
		};
		var angleStyle = {
			strokeStyle: '#FF0000',
			lineWidth: 2
		};


		// add renderer
		world.add(renderer);

		// render each step
		world.on('step', function(){

		    for (var i=0; i<players.length; ++i){
                if(players[i].ropeLengthDelta != 0){
                    players[i].resizeRope(players[i].ropeLengthDelta);
                }
                if(Math.abs(players[i].horizontalShift) > Gamepad.deadzone){ 
                    players[i].accelerate(Physics.vector(players[i].horizontalShift * 0.0005)); // todo: eliminate magic number
                }
                players[i].yankPlayer(); // tell this player to yank itself (won't do anything if not yank attached)
            }

            // look for bullets that are too far
            var bullets = world.find({label: 'bullet'});
            for (var i=0;i<bullets.length; ++i){
                var b = bullets[i];
                var p = players[b.playernum];

                if(b.state.pos.dist(p.body.state.pos) > 300){ // 300 is rope length. todo: define elsewhere
                    world.remove(b);
                    if(p.attachState == AttachStates.firing){
                        p.attachState = AttachStates.free;
                    }
                }

            }
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

		// constraints behavior for ropes etc
		var constr = Physics.behavior('verlet-constraints');
		world.add(constr);

        // possible rope attachment states
		var AttachStates = Object.freeze({"free":1, "attached":2, "firing":3, "attachedobj":4});

        // Player class
        function Player(pos, playernum) {
            this.body = Physics.body('circle', {
                    x: pos.x,
                    y: pos.y,
                    vx: 0.2,
                    vy: 0.01,
                    radius: 12,
                    restitution: 0.2,
                    label: 'player',
                    playernum: playernum
            });
            this.attach = Physics.body('circle', {
                    x: pos.x,
                    y: pos.y - 50, // todo: something smarter
                    radius: 8,
                    subconstr: undefined, // subconstraint
                    treatment: 'static'
            });

            this.yankAttach = Physics.body('circle', {
                    x: pos.x,
                    y: pos.y - 50, // todo: something smarter
                    radius: 8,
                    attachedto: undefined,
                    treatment: 'static'
            });

            this.playernum = playernum;
            this.ropeConstraint = constr.distanceConstraint(this.body, this.attach, 0, 100);
            this.attachState = AttachStates.attached;
            this.yankAttachState = AttachStates.free;
            this.attachedObj = undefined;
            this.yankedObj = undefined;

            this.ropeLengthDelta = 0;

            this.lookAngle = 0;
            this.horizontalShift = 0; // player biasing left or right

            world.add(this.body);
            world.add(this.attach);
            world.add(this.yankAttach);

            this.accelerate = function(v){this.body.accelerate(v);};
            this.detachRope = function(){
                this.attachState = AttachStates.free;
                constr.remove(this.ropeConstraint);
            }
            
            this.shootAnchor = function(angle, type){
                if (this.attachState == AttachStates.firing){
                    return;
                }
                if(type == 'hook'){
                    this.attachState = AttachStates.firing;
                }
                else if(type == 'yank'){
                    this.yankAttachState = AttachStates.firing;
                }
                var vx = Math.sin(angle);
                var vy = Math.cos(angle)*-1;
                //console.log("angle:" + angle + ", " + vx + " " + vy); 
                var b = Physics.body('circle', {
                    x: this.body.state.pos.x,
                    y: this.body.state.pos.y,
                    vx: vx,
                    vy: vy,
                    radius: 15,
                    label: 'bullet',
                    bulletType: type,
                    hidden: true,
                    playernum: this.playernum
                });
                if(type == 'hook'){
                    constr.remove(this.ropeConstraint);
                }
                world.add(b);
                bullet.push(b);
            }

            // change this player's attachment position to somewhere else
            this.attachRopeToPoint = function(pos){
                constr.remove(this.ropeConstraint); // remove this constraint if it exists
                this.attach.state.pos = pos;
                var dist = this.body.state.pos.dist(this.attach.state.pos);
                this.ropeConstraint = constr.distanceConstraint(this.body, this.attach, 0, dist);
                this.attachState = AttachStates.attached;
            };
            this.attachRopeToObject = function(obj){
                constr.remove(this.ropeConstraint); // remove this constraint if it exists
                //this.attach.state.pos = pos;
                //var dist = this.body.state.pos.dist(this.attach.state.pos);
                this.ropeConstraint = constr.distanceConstraint(this.body, obj);
                this.attachedObj = obj;
                this.attachState = AttachStates.attachedobj;
            };

            this.resizeRope = function(diff){ // todo: make this less clunkier. probably set a flag and let the clock deal with it each iter
                var len = this.ropeConstraint.targetLength + diff;
                if (len<0){ len = 0; }
                if (this.attachState == AttachStates.attached){
                    constr.remove(this.ropeConstraint);
                    this.ropeConstraint = constr.distanceConstraint(this.body, this.attach, 0, len);
                }
                else if(this.attachState == AttachStates.attachedobj){
                    constr.remove(this.ropeConstraint);
                    this.ropeConstraint = constr.distanceConstraint(this.body, this.attachedObj, 0, len);
                }
            };

            this.setYankAttach = function(pos){
                this.yankAttach.state.pos = pos;
                this.yankAttachState = AttachStates.attached;

            }
            this.setYankAttachObject = function(obj){
                this.yankAttachState = AttachStates.attachedobj;
                this.yankedObj = obj;
            }
            this.releaseYank = function(){
                if(this.yankAttachState == AttachStates.attachedobj){ this.yankedObj = undefined; }
                this.yankAttachState = AttachStates.free;
            }

            this.yankPlayer = function(){
                if(this.yankAttachState == AttachStates.attached) { 
                    var yankvel = 0.002;
                    var angle = angleBetweenPos(this.body.state.pos, this.yankAttach.state.pos);
                    var vx = Math.sin(angle)*yankvel;
                    var vy = Math.cos(angle)*-1*yankvel;

                    // cut current acceleration in half before applying new accel
                    this.body.state.acc = this.body.state.acc.mult(0.3);
                    this.accelerate(Physics.vector(vx, vy));
                }
                else if(this.yankAttachState == AttachStates.attachedobj){
                    var yankvel = 0.002;
                    var angle = angleBetweenPos(this.body.state.pos, this.yankedObj.state.pos);
                    var vx = Math.sin(angle)*yankvel;
                    var vy = Math.cos(angle)*-1*yankvel;

                    // cut current acceleration in half before applying new accel
                    //this.body.state.acc = this.body.state.acc.mult(0.7);
                    this.yankedObj.state.acc = this.yankedObj.state.acc.mult(0.4);
                    this.accelerate(Physics.vector(vx*0.2, vy*0.2));
                    this.yankedObj.accelerate(Physics.vector(vx * -1, vy * -1));

                }

            }
            this.getLookMarkerPos = function(){
                var x = Math.sin(this.lookAngle) * 40; // todo: 10 to variable for look dist
                var y = Math.cos(this.lookAngle) * -40; // todo: 10 to variable for look dist
                return Physics.vector(x + this.body.state.pos.x, y + this.body.state.pos.y);
            }

        }

        // end Player class

		// create a player
		var players = [];
		players[0] = new Player(Physics.vector(50,60), players.length);

		var bullet = [];

		var objects = [
		    Physics.body('rectangle', {
                x: 195,
                y: 134,
                width: 200,
                height: 70,
                restitution: 0.2,
                treatment: 'static'}),
		    Physics.body('rectangle', {
                x: 531,
                y: 134,
                width: 200,
                height: 70,
                restitution: 0.2,
                treatment: 'static'}),
		    Physics.body('rectangle', {
                x: 209,
                y: 441,
                width: 94,
                height: 285,
                restitution: 0.2,
                treatment: 'static'}),
		    Physics.body('rectangle', {
                x: 478,
                y: 540,
                width: 94,
                height: 285,
                restitution: 0.2,
                treatment: 'static'}),
		    Physics.body('rectangle', {
                x: 795,
                y: 895,
                width: 51,
                height: 51,
                restitution: 0.2,
                treatment: 'static'}),
		    Physics.body('rectangle', {
                x: 795,
                y: 540,
                width: 51,
                height: 51,
                restitution: 0.2,
                treatment: 'static'}),
		    Physics.body('rectangle', {
                x: 400,
                y: 540,
                width: 51,
                height: 51,
                restitution: 0.2}),
		    Physics.body('rectangle', {
                x: 180,
                y: 810,
                width: 200,
                height: 50,
                restitution: 0.2,
                treatment: 'static'}),
		    Physics.body('rectangle', {
                x: 857,
                y: 134,
                width: 200,
                height: 70,
                restitution: 0.2,
                treatment: 'static'}) ];


        for (var i=0; i<objects.length; ++i){
            world.add(objects[i]);
        }


		// ensure objects bounce when edge collision detected
		world.add(Physics.behavior('body-impulse-response', {check: 'collisions:applyimpulse'}).applyTo([players[0].body]) ); // todo: filter objects differently (don't want bullets to bounce)

		world.add(Physics.behavior('body-collision-detection'));
		world.add(Physics.behavior('sweep-prune'));

		// add some gravity
		world.add(Physics.behavior('constant-acceleration') );

		// allow interaction
		//world.add(Physics.behavior('interactive', {el: renderer.el}));

        var handlekey = function handlekey(evt){
            evt.preventDefault(); // stop things like space scrolling the page
            //console.log(evt);
            //console.log(e);
            switch(evt.keyCode)
            {
                case 119: // w (up)
                case 87:
                    //players[0].resizeRope(-10);
                    players[0].ropeLengthDelta = -2;
                    break;
                case 115: // s (down)
                case 83:
                    //players[0].resizeRope(10);
                    players[0].ropeLengthDelta = 2;
                    break;
                case 65: // a (left)
                    players[0].accelerate(Physics.vector(-0.0005));
                    break;
                case 68: // d (right)
                    players[0].accelerate(Physics.vector(0.0005));
                    break;
                case 32: // space
                    players[0].detachRope();
                    break;
            }

            //console.log(e.targetLength);
        }

        var handlekeyup = function handlekeyup(evt){
            switch(evt.keyCode)
            {
                case 87: // w up
                case 83: // s down
                    players[0].ropeLengthDelta = 0;
                    break;
            }
        };

		document.addEventListener('keydown', handlekey, false);
		document.addEventListener('keyup', handlekeyup, false);

        // handle gamepad events
        
        var gamepadPlayerMapping = [];

		Gamepad.onButtonDown = function(buttonnum, cnum){
		    var playernum = getOrAssignControllerPlayer(cnum);
		    var p = players[playernum];
		    switch(buttonnum)
            {
                case 0: // A
                case 5: // RB
                    p.detachRope();
                    break;
                case 12: // up
                    p.ropeLengthDelta = -2;
                    break;
                case 13: // down
                    p.ropeLengthDelta = 2;
                    break;
                case 6: // LT
                    p.shootAnchor(p.lookAngle, 'hook');
                    break;
                case 7: // RT
                    p.shootAnchor(p.lookAngle, 'yank');
                    break;
            }
        };

		Gamepad.onButtonUp = function(buttonnum, cnum){
		    var playernum = getOrAssignControllerPlayer(cnum);
		    var p = players[playernum];
		    switch(buttonnum)
            {
                case 12: // up
                case 13: // down
                    p.ropeLengthDelta = 0;
                    break;
                case 7: // RT (letting go of yank)
                    p.releaseYank();
            }
        };

        Gamepad.onRightStick = function(x,y, cnum){
            var playernum = getControllerPlayer(cnum);
            if (playernum == -1) { return; } // if this controller hasn't pressed a button yet, ignore it.
            var p = players[playernum];

            if(Math.abs(x) > Gamepad.deadzone || Math.abs(y) > Gamepad.deadzone){ // deadzone for look angle.
                var stickv = Physics.vector(x,y);
                var angle = stickv.angle() + 0.5*Math.PI;
                p.lookAngle = angle;
            }

        }

        Gamepad.onLeftStick = function(x,y, cnum){
            var playernum = getControllerPlayer(cnum);
            if (playernum == -1) { return; } // if this controller hasn't pressed a button yet, ignore it.
            var p = players[playernum];

            if(Math.abs(y) > Gamepad.deadzone){
                p.ropeLengthDelta = y*2;
            }
            else {
                p.ropeLengthDelta = 0;
            }

            p.horizontalShift = x;
        }

        function getOrAssignControllerPlayer(cnum){
            var undef;
            if (gamepadPlayerMapping[cnum] === undef){ // controller not assigned a player yet
                var pnum = addAPlayer();
                gamepadPlayerMapping[cnum] = pnum; // todo: expand when more players available or create a player here or something
            }
            return gamepadPlayerMapping[cnum];
        }
        function getControllerPlayer(cnum){
            var undef;
            if (gamepadPlayerMapping[cnum] === undef){ // controller not assigned a player
                return -1;
            } 
            return gamepadPlayerMapping[cnum];
        }

        // done gamepad events

        function addAPlayer(){
            players.push(new Player(Physics.vector(50,60), players.length));
            return players.length - 1;
        }



		function shootrope(pos, type){ // attach rope on click
		    var angle = angleBetweenPos(players[0].body.state.pos, pos);
			players[0].shootAnchor(angle, type);
		}

		function angleBetweenPos(body, target){
		    var relposX = target.x - body.x; 
		    var relposY = target.y - body.y;

		    //console.log("relpos: " + relposX + ", " + relposY);
			var vpos = Physics.vector(relposX, relposY);
			var angle = vpos.angle() + 0.5*Math.PI;
			return angle;

        }

        world.on('collisions:hook', function(data){ 
            if(data.object != undefined && data.object.playernum != undefined && data.object.playernum == data.playernum) { return; } // don't collide with your own bullet!
            world.remove(data.bullet)
            var p = players[data.playernum];
            switch(data.type)
            {
                case 'hook': // swinging hook event
                    if (p.attachState == AttachStates.firing){
                        if(data.object && data.object.treatment == 'dynamic' && (!data.object || data.object.playernum != data.playernum)){
                            p.attachRopeToObject(data.object);
                        }
                        else{
                            p.attachRopeToPoint(data.bullet.state.pos);
                        }
                    }
                    break;
                case 'yank':
                    if (p.yankAttachState == AttachStates.firing){
                        if(data.object && data.object.treatment == 'dynamic' && (!data.object || data.object.playernum != data.playernum)){
                            p.setYankAttachObject(data.object);
                        }
                        else{
                            p.setYankAttach(data.bullet.state.pos);
                        }
                    }
                    break;
            }

        });
        world.on('collisions:detected', function(data){
            //console.log(data);
            var c;
            var undef;
            for (var i=0, l=data.collisions.length; i<l; i++){
                if(data.collisions === undef) { continue; } // would break sometimes with Uncaught TypeError: Cannot read property '1' of undefined. 
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
                    var pnum = bul.playernum;
                    if (obj.label != 'bullet'){

                        console.log("bullet collision with a " + obj.label);
                        var data = {'bullet': bul, 'object': obj, 'type': bul.bulletType, 'playernum': pnum}
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
                    shootrope(pos, 'hook');
                    break;
                case 2: // rmb
                    shootrope(pos, 'yank');
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
            for(var i=0; i<players.length; ++i){
                if(players[i].attachState == AttachStates.attached){
                    renderer.drawLine(players[i].body.state.pos, players[i].attach.state.pos, ropeStyles, ctx);
                }
                else if(players[i].attachState == AttachStates.attachedobj){
                    renderer.drawLine(players[i].body.state.pos, players[i].attachedObj.state.pos, ropeStyles, ctx);
                }
                if(players[i].yankAttachState == AttachStates.attached){
                    renderer.drawLine(players[i].body.state.pos, players[i].yankAttach.state.pos, yankRopeStyles, ctx);
                }
                else if(players[i].yankAttachState == AttachStates.attachedobj){
                    renderer.drawLine(players[i].body.state.pos, players[i].yankedObj.state.pos, yankRopeStyles, ctx);
                }


                // start display look angle. 
                renderer.drawLine(players[i].body.state.pos, players[i].getLookMarkerPos(), angleStyle, ctx);
                // end display look angle
            }

            // draw lines for bullets
            var bullets = world.find({label: 'bullet'}); // todo: find happens twice per step-- once in render and once in step. can maybe optimize? same with above loop...
            for (var i=0;i<bullets.length; ++i){
                var b = bullets[i];
                var p = players[b.playernum];
                if(b.bulletType == 'hook'){
                    renderer.drawLine(p.body.state.pos, b.state.pos, ropeStyles, ctx);
                }
                else if(b.bulletType == 'yank'){
                    renderer.drawLine(p.body.state.pos, b.state.pos, yankRopeStyles, ctx);
                }
            }
		});

		renderer.addLayer('ropes', null, { zIndex:0 }).render = function(){
			this.ctx.clearRect(0, 0, this.el.width, this.el.height);
			world.emit('render-rope', this.ctx);
		};

		// subscribe to ticker to advance the simulation
		Physics.util.ticker.on(function(time,dt){
		    // update gamepad
            Gamepad.tick();
		    // update simulation
			world.step(time);
		});

		// start the ticker
		Physics.util.ticker.start();

	});
});
