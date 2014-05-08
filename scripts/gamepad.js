define(function () {
    // setup
    console.log("SETUP");
    
    return {
        lastpresses: [],
        variable: "name",
        callback: function(padstate, lastpress){
            //console.log("button pressed " + padstate);
            var undef;

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
        },
        onButtonDown: function(buttonnum){ // overwrite this in actual game code
            console.log("button " + buttonnum + " pressed");
        },
        onButtonUp: function(buttonnum){ // overwrite this in actual game code
            console.log("button " + buttonnum + " released");
        },
        tick: function(){
            // handle tick
            var gamepads = navigator.getGamepads();

            for (var i = 0; i<gamepads.length; ++i){
                var pad = gamepads[i];
                var undef;

                // initialize last presses if undefined
                if(this.lastpresses[i] === undef){
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
