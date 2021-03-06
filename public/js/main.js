$(window).on("load", function() {
    window.Resultstemplate = $("#ResultContainer").html();
    $("#ResultContainer").html("");
    $("#spinner").fadeOut();
})

// AJAX events handler

$(document).ajaxStart(function() {
    $("#spinner").fadeIn();
});

$(document).ajaxStop(function() {
    $("#spinner").fadeOut();
})

// user Search
var SearchInput = document.getElementById("SearchInput");

SearchInput.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      document.getElementById("SearchButton").click();
    }
});

$("#SearchButton").click(function (){
    var keyword = SearchInput.value;
    $.ajax({
        method: "GET",
        url: "/search/" + encodeURIComponent(keyword),
    })
    .done(function(result) {
        var HTMLString = "";
        for(i = 0; i < result.length; i++) {
            x = result[i];
            HTMLString += window.Resultstemplate
                .replace(/{{title}}/g, x.title)
                .replace(/{{thumbnail}}/g, x.thumbnail)
                .replace(/{{duration}}/g, x.duration)
                .replace(/{{channel}}/g, x.author.name)
                .replace(/{{ChannelLink}}/g, x.author.ref)
                .replace(/{{link}}/g, x.link)
                .replace(/{{verified}}/g, (x.author.verified) ? '<i class="fas fa-check-circle"></i>' : "");
        }
        $("#ResultContainer").html(HTMLString)
        $("#ResultContainer").slideDown();
    });
});

const DownloadAudio = function(link) {
    window.location.href = "/download/" + encodeURIComponent(link);
}