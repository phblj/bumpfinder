/*jshint eqnull:true */
(function() {

  var bumpFinder;

  function onSpeedChecked(e, data) {
		$("#speed").text(data.speed);
		$("#lat").text(data.latitude);
		$("#lng").text(data.longitude);
  }

  function onBumpDetected(e, data) {
		$("#mag").text(data.magnitude);
  }

  function onSubmit(e, data) {
    $("#console").prepend("<li><strong>Submitted at</strong> "+ new Data() +"</li>");
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
