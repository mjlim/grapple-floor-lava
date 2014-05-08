define(function () {
    // setup
    return {
        deadzone: 0.1,
        lastpresses: [],
        variable: "name",
        callback: function(padstate, lastpress){
            var undef;
            if(padstate === undef){ return; } // if there's no info just bail out instead of breaking.

            for (var i=0; i<padstate.buttons.length; ++i){
                if (padstate.buttons[i].pressed){
                    // debug h ook
                   }
                if (padstate.buttons[i].pressed && lastpress[i] == false){
                    this.onButtonDown(i);
                    lastpress[i] = true;
                }
                else if (!padstate.buttons[i].pressed && lastpress[i] == true){
                    this.onButtonUp(i);
                    lastpress[i] = false;
                }
            }
            
            // left stick
            // check that it is out of deadzone
            if(Math.abs(padstate.axes[0]) > this.deadzone && Math.abs(padstate.axes[1]) > this.deadzone){
                this.onLeftStick(padstate.axes[0], padstate.axes[1]);
            }
        },
        onButtonDown: function(buttonnum){ // overwrite this in actual game code
            console.log("button " + buttonnum + " pressed");
        },
        onButtonUp: function(buttonnum){ // overwrite this in actual game code
            console.log("button " + buttonnum + " released");
        },
        onLeftStick: function(x,y){ // overwrite this in actual game code
            console.log("axis: " + x + ", " + y);
        },
        tick: function(){
            // handle tick
            var gamepads = navigator.getGamepads();

            for (var i = 0; i<gamepads.length; ++i){
                var pad = gamepads[i];
                var undef;

                // initialize last presses if undefined
                if(this.lastpresses[i] === undef && pad !== undef){
                    this.lastpresses[i] = [];
                    for(var j=0; j<pad.buttons.length; ++j){
                        this.lastpresses[i][j] = false;
                    }
                }
                this.callback(pad, this.lastpresses[i]);
            }
        },
    }
});
