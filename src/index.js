const scrapy = require('./lib/scrapy');
const config = require('./config.json');
const log = require('./lib/log');

const Aria2 = require('aria2');
const aria2 = new Aria2({
  host: config.ariaHost,
  port: config.ariaPort,
  secure: config.ariaSecure,
  secret: config.ariaSecret,
  path: config.ariaPath
});


function sleep(delay) {
  var now = new Date();
  var exitTime = now.getTime() + delay;
  while (true) {
    now = new Date();
    if (now.getTime() > exitTime) {
      return;
    }
  }
}

const search = async () => {
  let page = config.page || 1;
  let video = -config.video || 0;
  let search = config.search;

  try {
    while (true) {
      const opts = {
        page,
        search,
        pathname: config.pathname
      };

      log.warn('-------------------- page ' + page + ' --------------------');
      let keys = await scrapy.findKeys(opts);
      for (let i = 0; !keys || keys.length === 0; i++) { //try 3 times fetching page
        if (i > 0) {
          log.error('page find nothing, try again');
        }
        sleep(3000);
        keys = await scrapy.findKeys(opts);
        if (i === 3) {
          break;
        }
      }

      if (!keys || keys.length === 0) {
        throw new Error('find nothing!');
      }

      log.info('find ' + keys.length + ' videos');
      let keyId;
      if (video < 0) {
        keyId = (-video) - 1;
        video = 0;
      } else {
        keyId = 0;
      }

      for (keyId; keyId < keys.length; keyId++) { //get url for each video
        log.info('find video ' + (keyId + 1));
        sleep(3000);
        let info = await scrapy.findDownloadInfo(keys[keyId]);
        for (let i = 0; !info; i++) { //try 3 times emmm
          if (i > 0) {
            log.error('can\'t find this video, try again');
          }
          sleep(3000);
          info = await scrapy.findDownloadInfo(keys[keyId]);
          if (i === 3) {
            break;
          }
        }
        if (!info) {
          log.info('can\'t find this video, download next one');
          continue;
        }
        log.warn('video ' + (keyId + 1) + ': ' + info.title);
        //console.log('info=', info);
        await aria2.call('addUri', [info.videoUrl.trim()], {
          out: config.downloadDir + info.title.trim().replace(/[\\|\/|\?|\:|\*|\<|\>|\||\"]/g, ' ') + '.mp4'
        });
      }
      console.log('\n');
      log.warn('-----------------------------------------------------------');
      page += 1;
    }
  } catch (error) {
    sleep(2000);
    console.log(error);
    aria2.close();
    log.error('exit');
    process.exit(0);
  }
};

function run() {
  aria2.open()
    .then(() => {
      log.info('Aria2 opened');
      search();
    })
    .catch(err => {
      console.error('Aria2 error', err);
    });
}


run();