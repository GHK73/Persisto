import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

console.log("🌐 Axios base URL:", BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

// Add Authorization header to all private requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const publicRoutes = [
      '/signup/request-otp',
      '/signup/verify-otp',
      '/signup/complete',
      '/signin',
      '/forgot-password/request-otp',
      '/forgot-password/verify-otp',
      '/forgot-password/reset',
    ];

    const isPublic = publicRoutes.some((route) => config.url.includes(route));
    if (token && !isPublic) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ========== AUTH & USER ==========

export const requestSignupOtp = (email) =>
  api.post('/signup/request-otp', { email });

export const verifySignupOtp = (email, otp) =>
  api.post('/signup/verify-otp', { email, otp });

export const completeSignup = (data) =>
  api.post('/signup/complete', data);

export const signinUser = (data) =>
  api.post('/signin', data);

export const checkAuth = () =>
  api.get('/check-auth').then((res) => res.data.user);

export const sendOtpToEmail = (email) =>
  api.post('/forgot-password/request-otp', { email });

export const verifyEmailOtp = (email, otp) =>
  api.post('/forgot-password/verify-otp', { email, otp });

export const resetPassword = (email, newPassword) =>
  api.post('/forgot-password/reset', { email, newPassword });

export const updateProfilePicture = (handle, formData) =>
  api
    .post(`/users/${handle}/profile-pic`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

export const getUserStats = (handle) =>
  api.get(`/users/${handle}/stats`).then((res) => res.data);

// ========== QUESTIONS ==========

export const getAllQuestions = () =>
  api.get('/questions').then((res) => res.data);

export const getQuestionById = (id) =>
  api.get(`/questions/${id}`).then((res) => res.data);

const getFileDescriptor = (file) => ({
  size: file.size,
  contentType: file.type || 'application/octet-stream',
});

const uploadToS3 = async (file, upload) => {
  const response = await fetch(upload.url, {
    method: 'PUT',
    headers: { 'Content-Type': upload.contentType },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`S3 upload failed with status ${response.status}`);
  }
};

export const addQuestion = async ({
  title,
  difficulty,
  timeLimitSec,
  memoryLimitMb,
  tags,
  description,
  testCases,
  sampleTestCases,
}) => {
  const manifest = {
    title,
    difficulty,
    timeLimitSec,
    memoryLimitMb,
    tags,
    description: getFileDescriptor(description),
    testCases: testCases.map(({ input, output }) => ({
      input: getFileDescriptor(input),
      output: getFileDescriptor(output),
    })),
    sampleTestCases: sampleTestCases.map(({ input, output }) => ({
      input: getFileDescriptor(input),
      output: getFileDescriptor(output),
    })),
  };

  const { data: session } = await api.post('/questions/uploads', manifest);
  const files = [
    [description, session.uploads.description],
    ...testCases.flatMap(({ input, output }, index) => [
      [input, session.uploads.testCases[index].input],
      [output, session.uploads.testCases[index].output],
    ]),
    ...sampleTestCases.flatMap(({ input, output }, index) => [
      [input, session.uploads.sampleTestCases[index].input],
      [output, session.uploads.sampleTestCases[index].output],
    ]),
  ];

  try {
    for (let index = 0; index < files.length; index += 4) {
      await Promise.all(files.slice(index, index + 4).map(([file, upload]) =>
        uploadToS3(file, upload)
      ));
    }
    const { data } = await api.post(`/questions/uploads/${session.uploadId}/complete`);
    return data;
  } catch (error) {
    try {
      await api.delete(`/questions/uploads/${session.uploadId}`);
    } catch (cleanupError) {
      console.error('Could not clean up failed question upload:', cleanupError);
    }
    throw error;
  }
};

export const updateQuestion = (id, formData) =>
  api.put(`/questions/${id}`, formData).then((res) => res.data);

export const deleteQuestion = (id) =>
  api.delete(`/questions/${id}`).then((res) => res.data);

export const getUserQuestions = () =>
  api.get('/questions/my-questions').then((res) => res.data);

// ========== CODE EXECUTION ==========

export const runCodeApi = (data) =>
  api.post('/code/run', data).then((res) => res.data);

export const submitCodeApi = (data) =>
  api.post('/code/submit', data).then((res) => res.data);

// ========== AI CODE REVIEW ==========

export const reviewCodeApi = (data) =>
  api.post('/code/review', data).then((res) => res.data);
