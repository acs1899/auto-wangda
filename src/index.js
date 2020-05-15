const axios = require('axios')
const qs = require('qs')
const schedule = require('node-schedule')
const aes = require('../utils/aes')
const config = require('../config')
const data = require('../config/loginForm')
const handleLogin = require('./login')
const handleSubject = require('./handleSubject')
const handleCourse = require('./handleCourse')

class AutoWangda {
  /**
   *Creates an instance of AutoWangda.
   * @param data {Object} 登录参数
   */
  constructor({ data, subjectId }) {
    this.data = data
    this.subjectId = subjectId
  }
  async init() {
    const authorization = await handleLogin(this.data)
    console.log('登录成功')
    const resourceIdList = await handleSubject(this.subjectId, authorization)
    console.log('获取专题信息完成')
    let logIds = []
    for (const resourceId of resourceIdList) {
      const logIdList = await handleCourse(resourceId, authorization)
      logIds = logIds.concat(logIdList)
    }
    console.log('获取课程信息完成')
    new SetInter({
      timer: 1,
      fn: function() {
        autoWangda.handlePostAll(logIds, authorization)
      }
    })
  }
  async handlePostAll(logIds, authorization) {
    for (const item of logIds) {
      const data = {
        logId: item.logId,
        lessonLocation: item.timeSecond,
        studyTime: item.timeSecond,
        resourceTotalTime: item.timeSecond,
        organizationId: '1'
      }
      const res = await this.requestVideoProgress(
        qs.stringify(aes.encryptObj(data)),
        authorization
      )
      const resData = res.data || {}
      if (resData.finishStatus === 2) {
        console.log(item.name + '已完成')
      } else {
        console.log(item.name + '学习中')
      }
    }
  }
  requestVideoProgress(postData, authorization) {
    return axios.post(
      config.url + 'api/v1/course-study/course-front/video-progress',
      postData,
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36'
        }
      }
    )
  }
}
// 定时任务
class SetInter {
  constructor({ timer, fn }) {
    this.timer = timer // 每几分钟执行
    this.fn = fn //执行的回调
    this.rule = new schedule.RecurrenceRule()
    this.rule.minute = this.setRule() // 调用原型方法，前端源码为1分钟轮询1次
    this.init()
  }
  setRule() {
    let rule = []
    let i = 1
    while (i < 60) {
      rule.push(i)
      i += this.timer
    }
    return rule //假设传入的timer为5，则表示定时任务每5分钟执行一次
    // [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56]
  }
  init() {
    schedule.scheduleJob(this.rule, () => {
      this.fn() // 定时调用传入的回调方法
    })
  }
}

const subjectId = config.subjectId
const autoWangda = new AutoWangda({ data, subjectId })
autoWangda.init()
