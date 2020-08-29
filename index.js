const express = require('express');
const app = express();
const port = 80;
const fs = require("fs");
const path = require('path');

const ytsr = require("ytsr");
ytsr.do_warn_deprecate = false;
const ytdl = require("ytdl-core");
ytdl.do_warn_deprecate = false;


app.listen(port, () => { // Start API server
  console.log('Server started.');
})

////////////////////////////////////////////////////////////////////
app.use('/', express.static('public'));

app.get('/search/:keyword/:results*?', async function (req, res) { // Search API
    res.setHeader('Access-Control-Allow-Origin', "*"); // Allow localHost requests
    const keyword = decodeURIComponent(req.params.keyword); // URL Decode 
    const isValidVideoData = await ytdl.validateURL(keyword) || await ytdl.validateID(keyword); // Check if it is a valid Youtube video link
    const Result = await SearchVideo(keyword, (isValidVideoData) ? "1" : "5"); // Await for Search result
    res.send(Result.items); // Return Result items as response
    res.end(); // end Request
});

app.get('/download/:url', async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', "*");
    var videoUrl = decodeURIComponent(req.params.url);
    const VideoData = await SearchVideo(videoUrl, 1);
    res.header('Content-Disposition', 'attachment; filename="[YT-D.com] - ' + VideoData.items[0].title + '.mp3"'); // SET HEADERS
    const stream = ytdl(videoUrl, { quality: "highestaudio" });

    stream.on('end', () => { // To be called at stream end event
      res.end(); // End response
      stream.destroy(); // destroy Stream leftovers
    });

    stream.pipe(res);
});

app.get('*', function(req, res){
  res.status(404).sendFile(path.join(__dirname + '/private/404.html'));
});

const SearchVideo = (keyword, limit) => {
  return new Promise( async (resolve, reject) => {
    try {
      const GetFilters = await ytsr.getFilters(keyword); // Gte filters
      const FinalFilter = GetFilters.get('Type').find(o => o.name === 'Video'); // Filter Filters lol
      const Result = await ytsr(null, { limit, nextpageRef: FinalFilter.ref }); // Wait for YTSR Result
      resolve(Result); // resolve Pormise
    } catch(error) {
      reject(error);
    }
  });
}