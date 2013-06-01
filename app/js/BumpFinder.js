/*jshint eqnull:true */
(function(exports) {

  var
    DEFAULT_URL          = "http://bumpfinder.appspot.com/",
    LOCATION_INTERVAL_MS = 500,
    earthRadiusInMiles   = 3959,
    timeHours            = LOCATION_INTERVAL_MS / 1000 / 60 / 60;

  function latLonToMPH(last, current) {
    return (
      Math.acos(
        Math.sin(last.latitude) * Math.sin(current.latitude) +
        Math.cos(last.latitude) * Math.cos(current.latitude) *
        Math.cos(current.longitude - last.longitude)
      ) * earthRadiusInMiles
    ) / timeHours;
  }

  function BumpFinder(email, url) {
    if (email == null) {
      throw "Email is required to initialize";
    }
    _.bindAll(this);
    this.email = email;
    this.url = url || DEFAULT_URL;
		this.isPaused = false;
    this.averageSpeed = 0;
    this.speedData = [0]; // last 20 speed measurements
    this.location = {
      last:    { latitude: 0, longitude: 0 },
      current: { latitude: 0, longitude: 0 }
    };
  }

  var fn = BumpFinder.prototype;

  fn.init = function() {
    exports.ondevicemotion = this.motionDetected;
    this.poll();
  };

  fn.updateSpeed = function(pos) {
		var speed;
		this.location.last = this.location.current;
		this.location.current = pos.coords;
    speed = latLonToMPH(this.location.last, this.location.current);
    if (speed < 120) { this.speedData.push(speed); }
    if (this.speedData.length > 20) { this.speedData.shift(); }
    this.averageSpeed = this.speedData.reduce(function(x,y) { return x + y; }) / this.speedData.length;
    $(this).trigger("speed_check", this.sanatize());
    _.delay(this.poll, LOCATION_INTERVAL_MS);
  };

  fn.poll = function() {
		if (this.isPaused) { return; }
		if (!navigator.geolocation) {
			return alert("This browser does not support GPS Data");
		}
    navigator.geolocation.getCurrentPosition(this.updateSpeed);
  };

  fn.motionDetected = function(e) {
    this.magnitude =
      Math.abs(e.acceleration.x) +
      Math.abs(e.acceleration.y) +
      Math.abs(e.acceleration.z);
    if (this.magnitude > 10.0) {
      $(this).trigger("bump_detected", this.sanatize());
      if (this.averageSpeed > 0) {
        this.submit();
      }
    }
  };

	fn.pause = function() {
		this.isPaused = true;
	};

	fn.resume = function() {
		this.isPaused = false;
		this.poll();
	};

  fn.sanatize = function() {
    return {
      latitude:  this.location.current.latitude,
      longitude: this.location.current.longitude,
      speed:     this.averageSpeed,
      magnitude: this.magnitude,
      email:     this.email
    };
  };

  fn.submit = _.throttle(function() {
    $(this).trigger("submit", this.sanatize());
    $.ajax({
      type:     "POST",
      url:      this.url,
      data:     this.sanatize(),
      success:  this.onSuccess,
      dataType: "json"
    });
  }, 5000);

  exports.BumpFinder = BumpFinder;

})(this);
/* vim:set ts=2 sw=2 noet: */
