import api from './axiosInstance';

/**
 * Helper to trigger native browser file download from an Axios binary blob response.
 */
const triggerBlobDownload = (data, defaultFilename) => {
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', defaultFilename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Report Service: Triggers formatted Excel spreadsheet downloads for courses, events, and master audits.
 */
const reportService = {
  /**
   * Download Course Attendance Excel (.xlsx)
   * @param {string} courseId - UUID of the course
   * @param {string} courseCode - e.g. 'CS101'
   */
  downloadCourseExcel: async (courseId, courseCode = 'Course') => {
    const response = await api.get(`/reports/course/${courseId}/excel`, {
      responseType: 'blob'
    });
    const filename = `TapsLog_Attendance_${courseCode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    triggerBlobDownload(response.data, filename);
  },

  /**
   * Download RSO Event Tap Attendance Excel (.xlsx)
   * @param {string} eventId - UUID of the event
   * @param {string} rsoAbbr - e.g. 'UA-ACM'
   */
  downloadRsoEventExcel: async (eventId, rsoAbbr = 'Event') => {
    const response = await api.get(`/reports/rso-event/${eventId}/excel`, {
      responseType: 'blob'
    });
    const filename = `TapsLog_Event_${rsoAbbr}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    triggerBlobDownload(response.data, filename);
  },

  /**
   * Download Master System-Wide Excel (.xlsx)
   */
  downloadMasterExcel: async () => {
    const response = await api.get('/reports/master/excel', {
      responseType: 'blob'
    });
    const filename = `TapsLog_Master_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    triggerBlobDownload(response.data, filename);
  }
};

export default reportService;