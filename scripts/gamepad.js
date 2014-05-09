define(function () {
    // setup
    return {
        deadzone: 0.1,
        lastpresses: [],
        variable: "name",
        callback: function(padstate, lastpress, cnum){
            var undef;
            if(padstate === undef){ return; } // if there's no info just bail out instead of breaking.

            for (var i=0; i<padstate.buttons.length; ++i){
                if (padstate.buttons[i].pressed && lastpress[i] == false){
                    this.onButtonDown(i, cnum);
                    lastpress[i] = true;
                }
                else if (!padstate.buttons[i].pressed && lastpress[i] == true){
                    this.onButtonUp(i, cnum);
                    lastpress[i] = false;
                }
            }
            
            // sticks
            this.onLeftStick(padstate.axes[0], padstate.axes[1], cnum);
            this.onRightStick(padstate.axes[2], padstate.axes[3], cnum);
        },
        onButtonDown: function(buttonnum, controller){ // overwrite this in actual game code
            console.log("button " + buttonnum + " pressed");
        },
        onButtonUp: function(buttonnum, controller){ // overwrite this in actual game code
            console.log("button " + buttonnum + " released");
        },
        onLeftStick: function(x,y, controller){ // overwrite this in actual game code
            console.log("axis: " + x + ", " + y);
        },
        onRightStick: function(x,y, controller){ // overwrite this in actual game code
            console.log("axis: " + x + ", " + y);
        },
        tick: function(){
            var undef;
            // handle tick
            
            if(navigator.getGamepads === undef) { return; } // no gamepad support? can't do anything.

            var gamepads = navigator.getGamepads();

            for (var i = 0; i<gamepads.length; ++i){
                var pad = gamepads[i];

                // initialize last presses if undefined
                if(this.lastpresses[i] === undef && pad !== undef){
                    this.lastpresses[i] = [];
                    for(var j=0; j<pad.buttons.length; ++j){
                        this.lastpresses[i][j] = false;
                    }
                }
                this.callback(pad, this.lastpresses[i], i);
            }
        },
    }
});
