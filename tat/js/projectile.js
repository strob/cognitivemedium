// projectile.js: A demo showing a prototype medium for reasoning
// about projectile motion in two dimensions.
//
// Very rough: the code has lots of inconsistent naming (and other
// inconsistencies); scoping problems; problems with styling; various
// kludges that would disappear in a well-designed system; and lots of
// other problems.  I believe it's the second non-trivial JS program
// I've written, and it shows.  Basically, it needs to be rewritten
// from scratch.
//
// By Michael Nielsen, November 2016
//
// MIT License
//
// Written to target Chrome (~53) on OS X

// The gravitational constant, in nominal units.  Be careful about the
// sign: in our co-ordinate system, with increasing y being "up", the
// acceleration is -g.
var g = 1;
var GHOSTCOLOR = "#707FF3"; // same as trajectory color in other medium
var GHOSTBORDER = "#0420F4"; // same as ball color in other medium

(function() {
    "use strict";
    // Configuration
    var DEBUGGING = false;
    var STARTSLIDE = 0;
    var StoneColor = "#0420F4"; // same as ball color in other medium
    // use a triad with distance 80 degrees (Paletton) to determine
    // the other two colors.  Note the second is darkened somewhat
    var Obj1Color = "#FC0036";
    var Obj2Color = "#649600";
    var HighlightTraj = DARKGOLD; // darker version of GOLD, provided by Paletton
    var ObjectRadius = 7; // used for stone and both other objects

    
    // setup scales: map x = 0 to 200 to 40 to 660 and y = 0 to 100 to
    // 460 to 100, as well as the corresponding maps for velocity
    function xScale(x) {
	return 40+x*620/200.0;
    }
    function yScale(y) {
	return 460-y*360/100.00;
    }

    function vxScale(vx) {
	return vx*620/200.0;
    }
    function vyScale(vy) {
	return -vy*360/100.00;
    }


    function ProjectileVector(demo, x, y, vx, vy) {
	this.demo = demo;
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.mouseover = false;
    }

    ProjectileVector.prototype.end = function() {
	return {x: xScale(this.x)+vxScale(this.vx), y: yScale(this.y)+vyScale(this.vy)};
    };

    ProjectileVector.prototype.color = function() {
	return (this.mouseover)? "#dddd55" : StoneColor;
    };

    ProjectileVector.prototype.display = function() {
	this.demo.ctx.arrow(xScale(this.x), yScale(this.y), this.end().x, this.end().y,
			    this.color());
    };

    ProjectileVector.prototype.checkMouseover = function(mouse) {
	// Return true if mouse if over the vector
	var xLeft = Math.min(xScale(this.x), xScale(this.x)+vxScale(this.vx));
	var yTop = Math.min(yScale(this.y), yScale(this.y)+vyScale(this.vy));
	var xRight = Math.max(xScale(this.x), xScale(this.x)+vxScale(this.vx));
	var yBottom = Math.max(yScale(this.y), yScale(this.y)+vyScale(this.vy));
	return (mouse.x > xLeft-mouse.img.width) && (mouse.x < xRight) &&
	    (mouse.y > yTop-mouse.img.height) && (mouse.y < yBottom);
    };


    ProjectileVector.prototype.swing = function(vx1, vy1, mouse, callback, trajectory) {
	// if the optional trajectory parameter is provided, we'll swing it around too
	var vx0 = this.vx, vy0 = this.vy;
	var mouseX0 = mouse.x, mouseY0 = mouse.y;
	var j = 0;
	var steps = Math.ceil(0.5*vectorLength(vxScale(vx1-vx0), vyScale(vy1-vy0)));
	interp.bind(this)();
	function interp() {
	    j++;
	    this.vx = vx0+(j/steps)*(vx1-vx0);
	    this.vy = vy0+(j/steps)*(vy1-vy0);
	    mouse.x = mouseX0+(j/steps)*vxScale(vx1-vx0);
	    mouse.y = mouseY0+(j/steps)*vyScale(vy1-vy0);
	    mouse.display();
	    if (trajectory) {
		trajectory.recomputeUnderGravity(this.vx, this.vy);
	    }
	    this.demo.display();
	    if (j < steps) {myRequestAnimationFrame(interp.bind(this));} else {callback();}
	}
    };


    function Ghosts(N, x0, y0, x1, y1) {
	this.ghosts = [];
	this.x0 = x0;
	this.y0 = y0;
	this.x1 = x1;
	this.y1 = y1;
	var ghost;
	var deltax = x1-x0, deltay = y1-y0;
	var phi = Math.acos(deltay / Math.sqrt(deltax*deltax+deltay*deltay));
	var phij, nx, ny, v;
	for (var j=1; j <=N; j++) {
	    phij = (j/(N+1))*phi;
	    nx = Math.sin(phij);
	    ny = Math.cos(phij);
	    v = Math.sqrt(g/2)*Math.abs(deltax/nx)/Math.sqrt(deltax*ny/nx-deltay);
	    this.ghosts.push(new Ghost(phij, x0, y0, nx, ny, v));
	}
    }

    Ghosts.prototype.display = function() {
	for (var j=0; j < this.ghosts.length; j++) {
	    this.ghosts[j].display();
	}
	var xFinal = 200;
	var deltaY = (xFinal/(this.x1-this.x0))*(this.y1-this.y0);
	projectileDemo.ctx.line(xScale(this.x1), yScale(-10), xScale(this.x1), yScale(130), GHOSTBORDER);
	// This assumes this.x0 is 0, as it is in my examples.
	projectileDemo.ctx.line(
	    xScale(this.x0), yScale(this.y0), xScale(xFinal), yScale(this.y0+deltaY), GHOSTBORDER);
    };

    Ghosts.prototype.suppress = function() {
	// this suppresses mouseover highlighting, which is used in
	// Ghost.prototype.display.  Something of a hack, should be
	// fixed by better design.
	for (var j=0; j < this.ghosts.length; j++) {this.ghosts[j].suppressFlag = true;}
    };

    Ghosts.prototype.express = function() {
	// Opposite of Ghosts.prototype.suppress
	for (var j=0; j < this.ghosts.length; j++) {this.ghosts[j].suppressFlag = false;}
    };

    function Ghost(phi, x0, y0, nx, ny, v) {
	this.positions = [];
	this.x0 = x0;
	this.y0 = y0;
	this.vx = v*nx;
	this.vy = v*ny;
	this.mouseover = false;
	this.suppressFlag = true; // don't change color on mouseover, initially
	function position(x0, vx, y0, vy, t) {
	    return {x: x0+vx*t, y: y0+vy*t-0.5*g*t*t, t: t};
	}
	for (var t=0; t <= 40; t+=0.5) {
	    this.positions.push(position(x0, this.vx, y0, this.vy, t));
	}
    }

    Ghost.prototype.display = function() {
	this.checkMouseover(mouse);
	var col = ((this.mouseover) && (!this.suppressFlag)) ? HighlightTraj : GHOSTCOLOR;
        for (var j=0; j < this.positions.length-1; j++) {
	    projectileDemo.ctx.line(
		xScale(this.positions[j].x), yScale(this.positions[j].y),
		xScale(this.positions[j+1].x), yScale(this.positions[j+1].y),
		col);
	}
    };

    Ghost.prototype.checkMouseover = function(mouse) {
	// Ideally, the redundancy between this and the corresponding
	// Trajectory method would be removed.
	var x = mouse.x+mouse.img.width/2;
	var y = mouse.y+mouse.img.height/2;
	function nearby(pos, x, y) {
	    return (Math.sqrt(Math.pow(xScale(pos.x)-x, 2)+Math.pow(yScale(pos.y)-y, 2)) < 10);
	}
	this.mouseover = (this.positions.some(function(p) {return nearby(p, x, y);}));
    };

    //
    // CREATE THE DEMO OBJECT, AND ADD THE SLIDES
    //
    var projectileDemo = new Demo("projectile", "canvas", STARTSLIDE, DEBUGGING); 

    var xAxis = {}, yAxis = {}, launchPoint = {};
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Suppose we're standing on top of a hill, and launch a projectile through the air");
	xAxis.display = function() {
	    projectileDemo.ctx.arrow(xScale(0), yScale(0), xScale(200), yScale(0), "#555555");
	}
	yAxis.display = function() {
	    projectileDemo.ctx.arrow(xScale(0), yScale(0), xScale(0), yScale(100), "#555555");
	}
	launchPoint.display = function() {
	    projectileDemo.ctx.strokeStyle = "#555555";
	    projectileDemo.ctx.line(xScale(-2), yScale(82), xScale(2), yScale(78));
	    projectileDemo.ctx.line(xScale(-2), yScale(78), xScale(2), yScale(82));
	}
	projectileDemo.scene.push(xAxis, yAxis, launchPoint);
	projectileDemo.display();
	callback();
    })


    function play(callback, t0) {
	var t0, t, t1=20, delta=0.2, j=0;
	if (!t0) {t0=0;}
	t = t0;
	cast();
	function cast() {
	    projectileDemo.ctx.clear();
	    projectileDemo.display(j);
	    j++;
	    t += delta;
	    if (t <= t1) {myRequestAnimationFrame(cast)} else {callback();}
	}
    }

    
    var traj, stone;
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "The projectile moves freeely, accelerating under gravity, and we "+
		"neglect air friction");
	var t0=0, t=t0, t1 = 20, delta = 0.2, j=0;
	traj = new Trajectory(projectileDemo, t0, t1, delta,
			      function(t) {return positionUnderGravity(0, 80, 8, 5, t0, t)},
			      xScale, yScale);
	stone = new Ball(projectileDemo, ObjectRadius, StoneColor, traj, xScale, yScale);
	projectileDemo.scene.push(traj, stone);
	mySetTimeout(function() {play(callback)}, 1500);
    })

    
    var traj1, traj2, object1, object2;
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Now suppose we have two target objects also flying around");
        var t0=0, t=t0, t1 = 20, delta = 0.2, j=0;
	traj1 = new Trajectory(projectileDemo, t0, t1, delta, positionObject1, xScale, yScale);
	traj2 = new Trajectory(projectileDemo, t0, t1, delta, positionObject2, xScale, yScale);
	object1 = new Ball(projectileDemo, ObjectRadius, Obj1Color, traj1, xScale, yScale);
	object2 = new Ball(projectileDemo, ObjectRadius, Obj2Color, traj2, xScale, yScale);
	projectileDemo.scene.push(traj1, traj2, object1, object2);
	mySetTimeout(function() {play(callback)}, 1500);
    })
    function positionObject1(t) {
	var x = 200-10*t;
	return {x: x, y: 20+x/3+10*Math.sin(t/2), t: t}
    }

    function positionObject2(t) {
	var rescaledT = Math.pow(t/20, 1.4)*20;
	var x = 200-10*rescaledT;
	return {x: x, y: 25-0.1*x+3*sawtooth(t/2), t: t}
    }
    
    projectileDemo.addMessageSlides(
	"The target trajectories are arbitrary &ndash; think of the targets as drones which "+
	    "can move in any fashion at all",
	"With its current aim, the projectile misses both targets");
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Let's watch again, noticing the projectile miss the targets");
	mySetTimeout(function() {play(callback)}, 1000);
    });
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "If we aim the projectile differently, we can ensure it hits "+
		"one of the targets");
	projectileDemo.removeObject(traj);
	projectileDemo.removeObject(stone);
	var t0=0, t=t0, t1 = 20, delta = 0.2, j=0;
	traj = new Trajectory(projectileDemo, t0, t1, delta,
			      function(t) {return positionUnderGravity(0, 80, 16, 0, t0, t)},
			      xScale, yScale);
	stone = new Ball(projectileDemo, ObjectRadius, StoneColor, traj, xScale, yScale);
	projectileDemo.scene.push(traj, stone);
	mySetTimeout(function() {play(callback)}, 1000);
    });
    projectileDemo.addMessageSlides(
	"But is it possible to launch the projectile so it intersects both targets?",
	"So it'll be &ldquo;killing two drones with one stone&rdquo;, so to speak?",
	"To solve this problem seems to me a non-trivial challenge in mechanics",
	"I spent a little time trying to solve it using a conventional algebraic approach, "
	    + "but didn't succeed",
	"But using an interface building in powerful ideas from mechanics, we'll make "+
	    "some real progress",
	"We won't solve the problem completely. But we will gain lots of understanding!",
	"As a warmup, let's work through the case with just a single target",
	"If you've ever spent much time throwing a ball, you know intuitively "+
	    "that it's always possible to hit such a target",
	"It's great to have that everyday intuition",
	"But it's also desirable to have a justification for the intuition, based "+
	    "on the laws of mechanics",
	"Building up our understanding of those laws ultimately leads to a deeper "
	    + "understanding of particle motion",
	"So I'll switch now to showing a rough prototype interface where we attack "+
	    "the single-target problem");
    
    var playIcon, timeSlider, resetTimeIcon, playForwardIcon, playBackwardIcon;
    var mouse, stoneVelocity;
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Here it is.  I've started out showing the stone, its launch velocity, and a "+
		"single target object");
	// reset time
	projectileDemo.k = 0;
	// add icons and mouse pointer
	projectileDemo.removeObject(traj2);
	projectileDemo.removeObject(object2);
	// add icons
	playIcon = new Icon(projectileDemo, "play", 0, 0, 44);
	var t0 = 0, t1 = 20, delta = 0.2, N = (t1-t0)/delta;;
	timeSlider = new Slider(projectileDemo, "&nbsp;time:", 44, 0, 100, 45, 5, t0, t1, t0, N);
	resetTimeIcon = new Icon(projectileDemo, "reset time", 144, 0, 90);
	playBackwardIcon = new Icon(projectileDemo, "<", 234, 0, 30);
	playForwardIcon = new Icon(projectileDemo, ">", 264, 0, 30);
	projectileDemo.scene.push(playIcon, timeSlider, resetTimeIcon, playBackwardIcon, playForwardIcon);
	// add the mouse
	mouse = new Mouse(projectileDemo, 50, 100);
	stoneVelocity = new ProjectileVector(projectileDemo, 0, 80, 8, 5);
	traj.recomputeUnderGravity(8, 5);
	projectileDemo.scene.push(stoneVelocity);
	projectileDemo.display();
	callback();
    })

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage("We can edit the launch velocity, and the trajectory changes");
	function swing() {
	    mySetTimeout(function() {stoneVelocity.swing(12, -4, mouse, callback, traj)}, 500)
	}
	mouse.move(
	    stoneVelocity.end().x-5, stoneVelocity.end().y-5, swing);
    })

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage("Let's see how the stone moves with the changed launch velocity");
	playIcon.clickBy(mouse, function() {play(callback)})
    })

    projectileDemo.addMessageSlides(
	"An elementary theorem of mechanics says that between any start point and any end point "+
	    "there is always a range of trajectories",
	"We can build this theorem into the interface"
    );

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "To see this, let's delete our trajectory, re-select the original start point, "+
		"select a point on the target trajectory, and select a trajectory for the stone");
	moveToTraj();
	function moveToTraj() {
	    mouse.move(114, 208, function() {mySetTimeout(removeStuff, 300)});
	}
	function removeStuff() {
	    projectileDemo.removeObject(stone);
	    projectileDemo.removeObject(traj);
	    projectileDemo.removeObject(stoneVelocity);
	    projectileDemo.display();
	    mySetTimeout(moveToLaunchPoint, 300);
	}
	function moveToLaunchPoint() {
	    mouse.move(xScale(0), yScale(80),
		       function() {mySetTimeout(moveToOther, 300)});
	}
	var ghosts, tempBall;
	function moveToOther() {
	    var j=0;
	    var x0 = xScale(0), y0 = yScale(80);
	    var x1 = xScale(100)-5, y1 = yScale(43.74)-5;
	    var steps=100;
	    interp();
	    function interp() {
		j++;
		var x = x0+(j/steps)*(x1-x0);
		var y = y0+(j/steps)*(y1-y0);
		if (j > 8) {
		    ghosts = new Ghosts(10, 0, 80, (j/steps)*100, 80+(j/steps)*(43.74-80));
		    projectileDemo.scene.push(ghosts);
		}
		mouse.x = x;
		mouse.y = y;
		mouse.display();
		projectileDemo.display();
		if ((j > 8) && (j < steps)) {
		    projectileDemo.removeObject(ghosts);
		}
		if (j === steps-10) {
		    tempBall = new StaticBall(
			projectileDemo, ObjectRadius, GOLD, xScale(100), yScale(43.74));
		    projectileDemo.scene.push(tempBall);
		    traj1.col = HighlightTraj;
		}
		if (j < steps) {myRequestAnimationFrame(interp)} else {
		    delete traj1.col;
		    mySetTimeout(selectGhost, 300);};
	    }
	}
	function selectGhost() {
	    ghosts.express();
	    mouse.move(xScale(42.5), yScale(102.6)-5,
		       function() {mySetTimeout(showTrajectory, 300)});
	}
	function showTrajectory() {
	    projectileDemo.removeObject(tempBall);
	    projectileDemo.removeObject(ghosts);
	    var t0=0, t1=20, delta=0.2;
	    var vx = ghosts.ghosts[3].vx;
	    var vy = ghosts.ghosts[3].vy;
	    traj = new Trajectory(
		projectileDemo, t0, t1, delta,
		function(t) {return positionUnderGravity(0, 80, vx, vy, t0, t)},
		xScale, yScale);
	    traj.vx = vx; // we'll need these later, which is why they're being set
	    traj.vy = vy;
	    projectileDemo.scene.push(traj);
	    projectileDemo.scene.push(stone);
	    stone.trajectory = traj;
	    projectileDemo.display();
	    callback();
	}
    })
    
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Let's see how the stone moves along its new trajectory");
	playIcon.clickBy(mouse, function() {play(callback)})
    })

    projectileDemo.addMessageSlide(
	"The stone doesn't hit the target trajectory at the right time");

    projectileDemo.addMessageSlide(
	"But we can address that by changing the timing of the throw");

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage("Let's reset the time to the start");
	resetTimeIcon.clickBy(mouse, resetTime);
	function resetTime() {
	    projectileDemo.k = 0;
	    projectileDemo.display();
	    callback();
	};
    })

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Let's manually move to the time the target crosses the stone's trajectory, then stop");
	playForwardIcon.clickBy(mouse, playForward); 
	function playForward() {
	    var j = 0;
	    playForwardIcon.span.style.color = GOLD;
	    interp();
	    function interp() {
		j++;
		projectileDemo.k = j;
		projectileDemo.display();
		if (j < 50) {mySetTimeout(interp, 35)} else {highlight()};
	    }
	}
	function highlight() {
	    playForwardIcon.span.style.color = "#777";
	    var oldColor = object1.color;
	    object1.color = GOLD;
	    projectileDemo.removeObject(object1);
	    projectileDemo.scene.push(object1);
	    projectileDemo.display();
	    object1.color = oldColor;
	    callback();
	}
    });

    var localBackwardIcon, localForwardIcon;
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Then displace the stone forward in time.  Informally, we're using the interface to "+
		"\"throw the stone earlier in time\"");
	projectileDemo.removeObject(stone);
	projectileDemo.scene.push(stone);
	mySetTimeout(function() {object1.color = GOLD; stone.clickBy(mouse, stoneColor);}, 0);
	function stoneColor() {
	    object1.color = Obj1Color;
	    stone.color = GOLD;
	    projectileDemo.display();
	    mySetTimeout(function() {
				     projectileDemo.display();
				     localIcons();},
			 300);
	};
	function localIcons() {
	    localBackwardIcon = new Icon(projectileDemo, "local <", 294, 0, 80);
	    localForwardIcon = new Icon(projectileDemo, "local >", 374, 0, 80);
	    projectileDemo.scene.push(localBackwardIcon, localForwardIcon);
	    localForwardIcon.clickBy(mouse, displaceStoneForward);
	}
	function displaceStoneForward() {
	    var j = 0;
	    var deltaT;
	    var displacedTraj;
	    localForwardIcon.span.style.color = GOLD;
	    interp();
	    function interp() {
		j++;
		stone.localDisplacement = j; // something of a hack,
					     // this moves the stone forward along the trajectory
		projectileDemo.display();
		if (j === 35) {
		    projectileDemo.display();
		}
		if (j < 38) {mySetTimeout(interp, 35);}
		else {
		    finishLocalDisplace();
		}
	    }
	}
	function finishLocalDisplace() {
	    mySetTimeout(eraseIcons, 300);
	}
	function eraseIcons() {
	    stone.color = StoneColor;
	    projectileDemo.removeObject(localForwardIcon);
	    projectileDemo.removeObject(localBackwardIcon);
	    removeElement(localForwardIcon.span);
	    removeElement(localBackwardIcon.span);
	    projectileDemo.display();
	    callback();
	}
    })

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Now rewind time everywhere so the stone goes back to the launch point");
	playBackwardIcon.clickBy(mouse, backward);
	function backward() {
	    stone.color = StoneColor;
	    projectileDemo.removeObject(traj);
	    projectileDemo.removeObject(traj1);
	    var t0=-7.6, t=t0, t1 = 20, delta = 0.2, j=0;
	    var vx = traj.vx;
	    var vy = traj.vy;
	    traj = new Trajectory(projectileDemo, t0, t1, delta,
				  function(t) {return positionUnderGravity(0, 80, vx, vy, t0, t)},
				  xScale, yScale);
	    traj1 = new Trajectory(projectileDemo, t0, t1, delta, positionObject1, xScale, yScale);
	    projectileDemo.scene.push(traj, traj1);
	    stone.trajectory = traj;
	    object1.trajectory = traj1;
	    stone.localDisplacement = 0;
	    projectileDemo.k = 0;
	    projectileDemo.removeObject(stone);
	    projectileDemo.scene.push(stone);
	    projectileDemo.removeObject(object1);
	    projectileDemo.scene.push(object1);
	    // now do the actual backward movement
	    var j = 88;
	    playBackwardIcon.span.style.color = GOLD;
	    interp();
	    function interp() {
		j--;
		projectileDemo.k = j;
		projectileDemo.display();
		if (j > 0) {mySetTimeout(interp, 35)}
		else {
		    playBackwardIcon.span.style.color = "#777";
		    callback();
		};
	    }
	}
    });

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "And then play the full trajectory, noticing that the stone does, indeed, hit the target");
	playIcon.clickBy(mouse, function() {play(callback, -7.6)});
    });

    projectileDemo.addMessageSlides(
	"What we learn from this argument is that from any starting point "+
	    "we can hit our target, at any point along its trajectory");
    
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "Okay, let's return to our original problem: casting our "
		+ "projectile to hit not one but two target objects");
	projectileDemo.removeObject(traj);
	projectileDemo.removeObject(traj1);
	projectileDemo.removeObject(stone);
	projectileDemo.removeObject(object1);
	var t0=0, t=t0, t1 = 20, delta = 0.2, j=0;
	traj = new Trajectory(projectileDemo, t0, t1, delta,
			      function(t) {return {x: 0, y: 80, t: t}}, xScale, yScale);
	stone.trajectory = traj;
	traj1 = new Trajectory(projectileDemo, t0, t1, delta, positionObject1, xScale, yScale);
	traj2 = new Trajectory(projectileDemo, t0, t1, delta, positionObject2, xScale, yScale);
	object1 = new Ball(projectileDemo, ObjectRadius, Obj1Color, traj1, xScale, yScale);
	object1.trajectory = traj1;
	object2 = new Ball(projectileDemo, ObjectRadius, Obj2Color, traj2, xScale, yScale);
	object2.trajectory = traj2;
	projectileDemo.scene.push(traj, traj1, traj2, object1, object2, stone);
	projectileDemo.k = 0;
	projectileDemo.display();
	callback();
    })

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage("Let's remind ourselves of how the target objects move");
	playIcon.clickBy(mouse, secondSetup);
	function secondSetup() {
	    play(callback);
	}
    })

    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "To attack the problem, let's pick out one point on the trajectory of one target object");
	resetTimeIcon.clickBy(mouse, resetTime);
	function resetTime() {
	    projectileDemo.k = 0;
	    projectileDemo.display();
	    mySetTimeout(hitPlay, 300);
	}
	function hitPlay() {
	    mySetTimeout(
		function() {playForwardIcon.clickBy(mouse, playForward)}, 300);
	}
	function playForward() {
	    var j = 0;
	    interp();
	    function interp() {
		j++;
		projectileDemo.k = j;
		projectileDemo.display();
		if (j < 50) {mySetTimeout(interp, 35)} else {callback();}
	    }
	}
    })

    projectileDemo.addMessageSlide("This point will do");
    
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "And let's consider all trajectories for our stone that collide with "+
		"the target, <em>at that point in time</em>");
	var ghosts;
	mySetTimeout(mouseToOrigin, 300);
	function mouseToOrigin() {
	    mouse.move(xScale(0), yScale(80), function() {mySetTimeout(moveToOther, 300)});
	}
	function moveToOther() {
	    var j=0;
	    var x0 = xScale(0), y0 = yScale(80);
	    var x1 = xScale(100)-5, y1 = yScale(43.74)-5;
	    var steps=100;
	    interp();
	    function interp() {
		j++;
		var x = x0+(j/steps)*(x1-x0);
		var y = y0+(j/steps)*(y1-y0);
		if (j > 8) {
		    ghosts = new Ghosts(10, 0, 80, (j/steps)*100, 80+(j/steps)*(43.74-80));
		    projectileDemo.scene.push(ghosts);
		}
		mouse.x = x;
		mouse.y = y;
		mouse.display();
		projectileDemo.display();
		if ((j > 8) && (j < steps)) {
		    projectileDemo.removeObject(ghosts);
		}
		if (j > steps-8) {
		    projectileDemo.ctx.ball(
			xScale(100), yScale(43.74), ObjectRadius, GOLD);
		}
		if (j < steps) {myRequestAnimationFrame(interp)}
		else {
		    projectileDemo.removeObject(stone);
		    projectileDemo.display();
		    callback();
		};
	    }
	}
    })

    function Wave(x0, y0, x1, y1, T) {
	this.x0 = x0;
	this.y0 = y0;
	this.x1 = x1;
	this.y1 = y1;
	this.T = T;
	this.deltax = this.x1-this.x0;
	this.deltay = this.y1-this.y0;
    }

    Wave.prototype.v = function(phi) {
	return Math.sqrt(g/2) * Math.abs(this.deltax/Math.sin(phi)) *
	    1/Math.sqrt(this.deltax/Math.tan(phi)-this.deltay);
    }

    Wave.prototype.x = function(phi, t) {
	return this.x1 +this.v(phi)*Math.sin(phi)*(t-this.T);
    }

    Wave.prototype.y = function(phi, t) {
	return this.y1 +
	    (this.v(phi)*Math.cos(phi)-g*this.deltax/(this.v(phi)*Math.sin(phi)))*(t-this.T) -
	    0.5*g*Math.pow((t-this.T), 2);
    }

    Wave.prototype.display = function(j) {
	var t = j*0.2;
	var phi;
	var steps = 200;
	var angle = Math.acos(
	    this.deltay/Math.sqrt(this.deltax*this.deltax+this.deltay*this.deltay));
	var x0, y0, x1, y1;
	for (var k=1; k < steps-1; k++) {
	    phi = (k/steps)*angle;
	    x0 = this.x(phi, t);
	    y0 = this.y(phi, t);
	    x1 = this.x(phi+angle/steps, t);
	    y1 = this.y(phi+angle/steps, t);
	    projectileDemo.ctx.line(
		xScale(x0), yScale(y0), xScale(x1), yScale(y1), StoneColor);
	}
    }
    
    projectileDemo.addSlide(function(callback) {
	projectileDemo.addMessage(
	    "We can play all the trajectories forward from the collision. "
		+ "There's a kind of wavefront of all possible "
		+ "trajectories emanating from the first target");
	playIcon.clickBy(mouse, launchWave);
	function launchWave() {
	    var wave = new Wave(0, 80, 100, 43.74, 10);
	    projectileDemo.scene.push(wave);
	    var j=50;
	    interp();
	    function interp() {
		j++;
		projectileDemo.display(j);
		if (j < 100) {mySetTimeout(interp, 150)} else {callback();}
	    }
	}
    })

    projectileDemo.addMessageSlides(
	"If you were watching closely, you may have noticed that the "
	    + "wavefront collides with the second target",
	"That tells us there is, indeed, a trajectory intersecting both targets",
	"Let's watch again, carefully, since it happens quickly");

    projectileDemo.addSlide(function(callback) {
	// same code as before
	playIcon.clickBy(mouse, launchWave);
	function launchWave() {
	    var wave = new Wave(0, 80, 100, 43.74, 10);
	    projectileDemo.scene.push(wave);
	    var j=50;
	    interp();
	    function interp() {
		j++;
		projectileDemo.display(j);
		if (j === 58) {
		    projectileDemo.addMessage(
			"Boom, there it is, the wavefront collides with "
			    + "the second target");
		}
		if (j < 100) {mySetTimeout(interp, 150)} else {callback();}
	    }
	}
    });

    projectileDemo.addMessageSlides(
	"The great thing is that most of the details of the trajectory of "
	    + "the second target <em>don't matter</em> to this argument",
	"What matters is that the second target starts to what I'll call the 'southeast' of the first "+
	    "target, that is, in the region to the right of the bounding vertical line, and below "+
	    "this other bounding line",
	"The reason is that the boundaries of the southeast region are asymptotes of the wavefront",
	"The vertical line is an asymptote because the nearby trajectories arise when we hurl the "+
	    "projectile very high, and it comes hurtling down incredibly fast",
	"And the other bounding line is an asymptote because the nearby trajectories arise when "
	    + "we hurl the projectile very fast almost directly toward the intersection point",
	"Using these facts and the intermediate value theorem it's possible to "
	    + "give a rigorous proof that the wavefront and the target collide",
	"I won't go through those details",
	"But the basic idea is that the wavefront completely encloses the "
	    + "region bounded by the asymptotes, and so must collide with the "
	    + "target at some point",
	"One caveat to making the proof work is that the target's velocity must be bounded, "
	    + "so it can't 'run away' from the wavefront too fast",
	"But provided that's true, the target can't escape!",
	"The upshot of all this is that we've discovered something very interesting:",
	"Provided the targets have bounded velocity, and one is to the "+
	    "'southeast' of the other at some point, we can throw "
	    + "a stone so as to collide with both targets",
	"This isn't a complete answer to the question 'When can we ensure a projectile passes through "+
	    "two targets?'",
	"But it's a good start, a non-trivial insight, a small discovery"
    );

    
    // Main animation loop
    projectileDemo.rerun(projectileDemo.STARTSLIDE);
    projectileDemo.anim();

}());

function positionUnderGravity(x0, y0, vx0, vy0, t0, t) {
    // returns the position of an object falling freely under the
    // influence of gravity at time t, with given initial
    // conditions
    return {x: x0+vx0*(t-t0), y: y0+vy0*(t-t0)-0.5*g*(t-t0)*(t-t0), t: t};
}

//
// GENERAL HELPER FUNCTIONS
//
function sawtooth(x) {
    return 2*(x-Math.floor(x))-1;
}

function removeElement(elt) {
    elt.parentElement.removeChild(elt);
}


		 
