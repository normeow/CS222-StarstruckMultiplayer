var ready = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function () {
    //create an instance of eureca.io client
    var eurecaClient = new Eureca.Client();

    eurecaClient.ready(function (proxy) {
        eurecaServer = proxy;
        ready = true;
    });

    eurecaClient.exports.setId = function (id) {
        //create() is moved here to make sure nothing is created before uniq id assignation
        myId = id;
        create();
        eurecaServer.handshake();
        ready = true;
    }

    eurecaClient.exports.remove = function (id) {
        if (playersList[id]) {
            playersList[id].kill();
            delete playersList[id]
            console.log('remove ', id, playersList[id]);
        }

    }

    eurecaClient.exports.spawn = function (id, x, y) {

        if (id == myId)
            return; //this is me

        var new_player = new Player(x, y)

        console.log('SPAWN: %s on Client %s, ', id, myId);
        playersList[id] = new_player;
    }

    eurecaClient.exports.updateState = function(id, state)
    {
        if (myId == id)
             return

        console.log('updateState of player with id=', id);
        if (playersList[id])  {
            playersList[id].input = state;
            playersList[id].dude.x = state.x;
            playersList[id].dude.y = state.y;
            playersList[id].update();
        }
    }
};

Player = function (x, y) {
    this.lastState = {
        left: false,
        right: false,
        idle: false,
        jump: false,
    }

    // new state
    this.input = {
        left: false,
        right: false,
        idle: false,
        jump: false,
    }


    this.game = game;

    // create dude sprite
    this.dude = this.game.add.sprite(x, y, 'dude');
    this.jumpTimer = 0;

    // set physics
    this.game.physics.enable(this.dude, Phaser.Physics.ARCADE);
    this.dude.body.bounce.y = 0.2;
    this.dude.body.collideWorldBounds = true;

    //this.dude.body.setSize(20, 32, 5, 16);
    this.dude.animations.add('left', [0, 1, 2, 3], 10, true);
    this.dude.animations.add('turn', [4], 20, true);
    this.dude.animations.add('right', [5, 6, 7, 8], 10, true);


};

Player.prototype.isInputChanged = function(){
    return (
        this.input.left != this.lastState.left ||
        this.input.right != this.lastState.right ||
        this.input.idle != this.lastState.idle
    );
}

Player.prototype.kill = function(){

    this.dude.kill()
}

Player.prototype.update = function () {
    this.game.physics.arcade.collide(this.dude, layer);
    this.dude.body.velocity.x = 0;

    if (this.input.left) {
        this.dude.body.velocity.x = -150;
        this.dude.animations.play('left');

        if (!this.lastState.left) {
            this.lastState.left = true
        }
        this.lastState.right = false
        this.lastState.idle = false
    }
    else if (this.input.right) {
        this.dude.body.velocity.x = 150;
        this.dude.animations.play('right');

        if (!this.lastState.right) {
            this.lastState.right = true
        }
        this.lastState.left = false
        this.lastState.idle = false
    }
    // if input.idle
    else {
        if (!this.lastState.idle) {
            this.dude.animations.play('turn');

            if (this.lastState.left) {
                this.dude.frame = 0;
            }
            else {
                this.dude.frame = 5;
            }

            this.lastState.idle = true;
            this.lastState.left = false
            this.lastState.right = false


        }
    }

    if (this.input.jump && this.dude.body.onFloor() /*&& this.game.time.now > this.jumpTimer*/) {
        this.dude.body.velocity.y = -250;
        //this.jumpTimer = this.game.time.now + 750;
        this.lastState.jump = true
    }
    else{
         this.lastState.jump = false
    }
}

var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', {
    preload: preload,
    create: eurecaClientSetup,
    update: update,
    render: render
});

function preload() {

    game.stage.disableVisibilityChange = true;
    game.load.tilemap('level1', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles-1', 'assets/tiles-1.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
    game.load.spritesheet('droid', 'assets/droid.png', 32, 32);
    game.load.image('starSmall', 'assets/star.png');
    game.load.image('starBig', 'assets/star2.png');
    game.load.image('background', 'assets/background2.png');

}

var myId;
var map;
var layer;
var player;
var cursors;
var jumpButton;
var bg;
var playersList = {};

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);

    game.stage.backgroundColor = '#000000';


    bg = game.add.tileSprite(0, 0, 800, 600, 'background');
    bg.fixedToCamera = true;

    map = game.add.tilemap('level1');

    map.addTilesetImage('tiles-1');

    map.setCollisionByExclusion([13, 14, 15, 16, 46, 47, 48, 49, 50, 51]);

    layer = map.createLayer('Tile Layer 1');

    //  Un-comment this on to see the collision tiles
    // layer.debug = true;

    layer.resizeWorld();

    game.physics.arcade.gravity.y = 250;
    player = new Player(32, 32)
    playersList[myId] = player

    game.camera.follow(player.dude);

    cursors = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

function update() {
    if (!ready) return;

    player.input.jump = jumpButton.isDown;
    player.input.left = cursors.left.isDown;
    player.input.right = cursors.right.isDown;
    player.input.idle = !(cursors.left.isDown || cursors.right.isDown);
    player.input.x = player.dude.x
    player.input.y = player.dude.y


    //if (player.isInputChanged()){
        eurecaServer.handleKeys(player.input)
        // console.log("request server to handleKeys from ", myId)
    //}

    for (var i in playersList){
        if (!playersList[i])
            continue
        // console.log("updating ", i)
        playersList[i].update()
    }



}

function render() {

    // game.debug.text(game.time.physicsElapsed, 32, 32);
    // game.debug.body(player);
    // game.debug.bodyInfo(player, 16, 24);

}
