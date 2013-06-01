/*jshint eqnull:true */
(function() {

  var bumpFinder;

  function onSpeedChecked(e, data) {
    $("#console").prepend("<li>Speed Checked: "+ data.speed +"</li>");
  }

  function onBumpDetected(e, data) {
    $("#console").prepend("<li>Bump Detected: "+ data.magnitude +"</li>");
  }

  function onSubmit(e, data) {
    $("#console").prepend("<li><strong>Submitted</strong></li>");
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
