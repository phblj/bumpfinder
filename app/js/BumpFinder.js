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
        Math.sin(last.lat) * Math.sin(current.lat) +
        Math.cos(last.lat) * Math.cos(current.lat) *
        Math.cos(current.lng - last.lng)
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
    this.averageSpeed = 0;
    this.speedData = [0]; // last 20 speed measurements
    this.location = {
      last:    { lat: 0, lng: 0 },
      current: { lat: 0, lng: 0 }
    };
  }

  var fn = BumpFinder.prototype;

  fn.init = function() {
    exports.ondevicemotion = this.motionDetected;
    this.poll();
  };

  fn.updateSpeed = function() {
    var speed = latLonToMPH(this.location.last, this.location.current);
    if (speed < 120) { this.speedData.push(speed); }
    if (this.speedData.length > 20) { this.speedData.shift(); }
    this.averageSpeed = this.speedData.reduce(function(x,y) { return x + y; }) / this.speedData.length;
    $(this).trigger("speed_check", this.sanatize());
    _.delay(this.poll, LOCATION_INTERVAL_MS);
  };

  fn.poll = function() {
    if (!navigator.geolocation) { return; }
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

  fn.sanatize = function() {
    return {
      latitude:  this.location.current.lat,
      longitude: this.location.current.lng,
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
