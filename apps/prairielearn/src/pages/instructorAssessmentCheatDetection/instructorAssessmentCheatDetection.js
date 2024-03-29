const ERR = require('async-stacktrace');
const _ = require('lodash');
const async = require('async');

const asyncHandler = require('express-async-handler');
const express = require('express');
const router = express.Router();

const { stringify } = require('@prairielearn/csv');
const path = require('path');
const debug = require('debug')('prairielearn:' + path.basename(__filename, '.js'));

const sanitizeName = require('../../lib/sanitize-name');
const sqldb = require('@prairielearn/postgres');


const sql = sqldb.loadSqlEquiv(__filename);

const setFilenames = function (locals) {
  const prefix = sanitizeName.assessmentFilenamePrefix(
    locals.assessment,
    locals.assessment_set,
    locals.course_instance,
    locals.course
  );
  locals.cheatDetectionCsvFilename = prefix + 'cheat_detection.csv';
};

// var psersonalAccessToken = "234c3c9d-a00a-4184-b5be-ac2abd6eed56 ";
const personalAccessToken = 'b400e6fc-b02a-46f0-b74d-f61e7e3ddc95';
console.log("backend received PAT: ", personalAccessToken);

router.get('/', function (req, res, next) {
  debug('GET /');
  setFilenames(res.locals);
  console.log("res", res);
  async.series(
    [
      // function (callback) {
      //   debug('cheat-detection backend');
      //   // calling python script
      //   var util = require("util");
      //   var spawn = require("child_process").spawn;

      //   // 1. pull data
      //   // create folder to save log files
      //   var fs = require('fs');
      //   const logDataDir = 'pages/instructorAssessmentCheatDetection/cheat-detection-py/studentLog';
      //   if (!fs.existsSync(logDataDir)) {
      //     fs.mkdirSync(logDataDir, {recursive: true});
      //   }
      //   var pythonProcessPullData = spawn('python3',['tools/api_download.py',
      //                                               '-t', personalAccessToken,
      //                                               '-i', res.locals.course.id,
      //                                               '-a', res.locals.assessment.id,
      //                                               '-o', logDataDir,
      //                                               '-s', 'http://localhost:3000/pl/api/v1']);

      //   // 2. convert json to csv
      //   var pythonProcessConvertData = spawn('python3',['pages/instructorAssessmentCheatDetection/cheat-detection-py/json_to_csv.py',
      //                                               '-i', logDataDir,
      //                                               '-o', logDataDir]);

      //   // 3. calculate the similarity values
      //   var pythonProcessCalculate = spawn('python3',["pages/instructorAssessmentCheatDetection/cheat-detection-py/main.py", 
      //                                         '-d', logDataDir,
      //                                         '-o', 'pages/instructorAssessmentCheatDetection/cheat-detection-py',
      //                                         '-w1', '0.4',
      //                                         '-w2', '0.3',
      //                                         '-w3', '0.3']);

      //   // 4. delete data files
      //   fs.rmdir(logDataDir);


      //   var params = { assessment_id: res.locals.assessment.id };
      //   sqldb.queryOneRow(sql.assessment_stats, params, function (err, result) {
      //     if (ERR(err, callback)) return;
      //     res.locals.assessment_stat = result.rows[0];
      //     callback(null);
      //   });
      // },
      // function (callback) {
      //   debug('query assessment_duration_stats');
      //   // FIXME: change to assessment_instance_duration_stats and show all instances
      //   var params = { assessment_id: res.locals.assessment.id };
      //   sqldb.queryOneRow(sql.assessment_duration_stats, params, function (err, result) {
      //     if (ERR(err, callback)) return;
      //     res.locals.duration_stat = result.rows[0];
      //     callback(null);
      //   });
      // },
      // function (callback) {
      //   debug('query assessment_score_histogram_by_date');
      //   var params = { assessment_id: res.locals.assessment.id };
      //   sqldb.query(sql.assessment_score_histogram_by_date, params, function (err, result) {
      //     if (ERR(err, next)) return;
      //     res.locals.assessment_score_histogram_by_date = result.rows;
      //     callback(null);
      //   });
      // },
      // function (callback) {
      //   debug('query user_scores');
      //   var params = { assessment_id: res.locals.assessment.id };
      //   sqldb.query(sql.user_scores, params, function (err, result) {
      //     if (ERR(err, callback)) return;
      //     res.locals.user_scores = result.rows;
      //     callback(null);
      //   });
      // },
    ],
    function (err) {
      if (ERR(err, next)) return;
      debug('render page');
      res.render(__filename.replace(/\.js$/, '.ejs'), res.locals);
    }
  );

});

router.get(
  '/:filename',
  asyncHandler(async (req, res, next) => {
    if (req.params.filename === logCsvFilename(res.locals)) {
      const cursor = await assessment.selectAssessmentInstanceLogCursor(
        res.locals.assessment_instance.id,
        false
      );

      const stringifier = stringifyStream({
        header: true,
        columns: ['Time', 'Auth user', 'Event', 'Instructor question', 'Student question', 'Data'],
        transform(record) {
          console.log('=========RECORD!!!!!!======',record);
          return [
            record.date_iso8601,
            record.auth_user_uid,
            record.event_name,
            record.instructor_question_number == null
              ? null
              : 'I-' + record.instructor_question_number + ' (' + record.qid + ')',
            record.student_question_number == null
              ? null
              : 'S-' +
                record.student_question_number +
                (record.variant_number == null ? '' : '#' + record.variant_number),
            record.data == null ? null : JSON.stringify(record.data),
          ];
        },
      });

      res.attachment(req.params.filename);
      await pipeline(cursor.stream(100), stringifier, res);
    } else {
      next(error.make(404, 'Unknown filename: ' + req.params.filename));
    }
  })
);

module.exports = router;