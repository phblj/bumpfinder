/*jshint eqnull:true */
(function() {

  var bumpFinder;

  function onSpeedChecked(e, data) {
		var prog_val = Math.floor(data.magnitude * 10);
		$("#progbar").css("width", "" + prog_val + "%");
		$("#speed").text(data.speed);
		$("#lat").text(data.latitude);
		$("#lng").text(data.longitude);
		$("#mag").text(data.magnitude);
  }

  function onBumpDetected(e, data) {
		$("#prog").addClass("progress-danger");
		_.delay(function() {
			$("#prog").removeClass("progress-danger");
		}, 750);
  }

  function onSubmit(e, data) {
    $("#console").prepend("<li><strong>Submitted at</strong> "+ new Date() +"</li>");
  }

  function runNewFinder() {
    bumpFinder = new BumpFinder(localStorage.user_email);
    $(bumpFinder)
      .on("speed_check", onSpeedChecked)
      .on("bump_detected", onBumpDetected)
      .on("submit", onSubmit);
    bumpFinder.init();
  }

  function setEmail() {
    localStorage.user_email = $("#email").val();
    runNewFinder();
  }

  $(function() {
    $("#email").val(localStorage.user_email);
    $("#acceptEmail").on("click", setEmail);
    if (localStorage.user_email != null && localStorage.user_email !== "") {
      runNewFinder();
    }
  });

})();
/* vim:set ts=2 sw=2 noet: */
