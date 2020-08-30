const express = require('express');
const app = express();
const port = 80;
const fs = require("fs");
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
    res.header('Content-Disposition', 'attachment; filename="[YT-D.com] - ' + VideoData.items[0].title + '.mkv"'); // SET HEADERS

    const video = ytdl(videoUrl, { filter: 'videoonly', quality: 'highestvideo' });
    const audio = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });
    const ffmpegProcess = cp.spawn(ffmpeg, [
      // Remove ffmpeg's console spamming
      '-loglevel', '0', '-hide_banner',
      // Redirect/enable progress messages
      '-progress', 'pipe:3',
      // 3 second audio offset
      '-itsoffset', '3.0', '-i', 'pipe:4',
      '-i', 'pipe:5',
      // Choose some fancy codes
      '-c:v', 'libx265', '-x265-params', 'log-level=0',
      '-c:a', 'flac',
      // Define output container
      '-f', 'matroska', 'pipe:6',
    ], {
      windowsHide: true,
      stdio: [
        /* Standard: stdin, stdout, stderr */
        'inherit', 'inherit', 'inherit',
        /* Custom: pipe:3, pipe:4, pipe:5, pipe:6 */
        'pipe', 'pipe', 'pipe', 'pipe',
      ],
    });
    /*ffmpegProcess.stdio[3].on('data', chunk => {
      // Parse the param=value list returned by ffmpeg
      const lines = chunk.toString().trim().split('\n');
      const args = {};
      for (const l of lines) {
        const [key, value] = l.trim().split('=');
        args[key] = value;
      }
      tracker.merged = args;
    });*/
    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5]);
    ffmpegProcess.stdio[6].pipe(res);
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