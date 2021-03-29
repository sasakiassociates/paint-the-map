const gup = function (name, defaultValue) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results == null) return defaultValue;
    return results[1];
};
const gupInt = function (name, defaultValue) {
    var ans = gup(name, defaultValue);
    if (typeof ans == "string") {
        return parseInt(ans);
    }
    return ans;
};
const gupFloat = function (name, defaultValue) {
    var ans = gup(name, defaultValue);
    if (typeof ans == "string") {
        return parseFloat(ans);
    }
    return ans;
};
