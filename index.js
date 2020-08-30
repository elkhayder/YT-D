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
    res.header('Content-Disposition', 'attachment; filename="[YT-D.com] - ' + VideoData.items[0].title + '.mkv"'); // SET HEADERS

    const tracker = {
      start: Date.now(),
      audio: { downloaded: 0, total: Infinity },
      video: { downloaded: 0, total: Infinity },
      merged: { frame: 0, speed: '0x', fps: 0 },
    };
    
    // Get audio and video stream going
    const audio = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' })
      .on('progress', (_, downloaded, total) => {
        tracker.audio = { downloaded, total };
      });
    const video = ytdl(videoUrl, { filter: 'videoonly', quality: 'highestvideo' })
      .on('progress', (_, downloaded, total) => {
        tracker.video = { downloaded, total };
      });
    
    // Get the progress bar going
    const progressbar = setInterval(() => {
      readline.cursorTo(process.stdout, 0);
      const toMB = i => (i / 1024 / 1024).toFixed(2);
    
      process.stdout.write(`Audio  | ${(tracker.audio.downloaded / tracker.audio.total * 100).toFixed(2)}% processed `);
      process.stdout.write(`(${toMB(tracker.audio.downloaded)}MB of ${toMB(tracker.audio.total)}MB).${' '.repeat(10)}\n`);
    
      process.stdout.write(`Video  | ${(tracker.video.downloaded / tracker.video.total * 100).toFixed(2)}% processed `);
      process.stdout.write(`(${toMB(tracker.video.downloaded)}MB of ${toMB(tracker.video.total)}MB).${' '.repeat(10)}\n`);
    
      process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
      process.stdout.write(`(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`);
    
      process.stdout.write(`running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(2)} Minutes.`);
      readline.moveCursor(process.stdout, 0, -3);
    }, 1000);
    
    // Start the ffmpeg child process
    const ffmpegProcess = cp.spawn(ffmpeg, [
      // Remove ffmpeg's console spamming
      '-loglevel', '0', '-hide_banner',
      // Redirect/enable progress messages
      '-progress', 'pipe:3',
      // 3 second audio offset
      '-itsoffset', '3.0', '-i', 'pipe:4',
      '-i', 'pipe:5',
      // Choose some fancy codes
      '-c:v', 'libx264', '-x265-params', 'log-level=0',
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
    ffmpegProcess.on('close', () => {
      process.stdout.write('\n\n\n\n');
      clearInterval(progressbar);
      console.log('done');
    });
    
    // Link streams
    // FFmpeg creates the transformer streams and we just have to insert / read data
    ffmpegProcess.stdio[3].on('data', chunk => {
      // Parse the param=value list returned by ffmpeg
      const lines = chunk.toString().trim().split('\n');
      const args = {};
      for (const l of lines) {
        const [key, value] = l.trim().split('=');
        args[key] = value;
      }
      tracker.merged = args;
    });
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