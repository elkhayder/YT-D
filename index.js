const express = require('express');
const app = express();
const port = 80;
const fs = require("fs");
const readline = require('readline');
const cp = require('child_process');
const path = require('path');
const ffmpeg = require("ffmpeg-static")
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
    //res.header('Content-Disposition', 'attachment; filename="[YT-D.com] - ' + VideoData.items[0].title + '.mp4"'); // SET HEADERS
    // Get audio and video stream going
    const thisID = makeid(10);
    const audio = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' }).pipe(fs.createWriteStream(path.join("PreProcess", thisID + " - Audio.mp4")));
    const video = ytdl(videoUrl, { filter: 'videoonly', quality: 'highestvideo' }).pipe(fs.createWriteStream(path.join("PreProcess", thisID + " - Video.mp4")));
    const {audioR, videoR} = await Promise.all(audio, video);
    // Start the ffmpeg child process
    const ffmpegProcess = cp.spawn(ffmpeg, [
      // Remove ffmpeg's console spamming
      '-loglevel', '0', '-hide_banner',
      // Pipe content
      '-i', path.join("PreProcess", thisID + " - Audio.mp4"),
      '-i', path.join("PreProcess", thisID + " - Video.mp4"),
      // Choose some fancy codes
      '-c:v', 'libx264', '-x265-params', 'log-level=0', '-crf', '28',
      '-c:a', 'flac',
      // Define output container
      '-f', 'matroska', path.join("PreProcess", thisID + " - Final.mp4"),
    ]);
    ffmpegProcess.on('close', () => {
      res.send(path.join("PreProcess", thisID + " - Final.mp4"));
    });
    /*const stream = ytdl(videoUrl, { quality: "highestaudio" });
    stream.on('end', () => { // To be called at stream end event
      res.end(); // End response
      stream.destroy(); // destroy Stream leftovers
    });

    stream.pipe(res);*/
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

const makeid = function(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
