// Give API requests an explicit failure until the ASP.NET backend is configured.
export default {
  fetch() {
    return Response.json({ code: 'BACKEND_NOT_CONFIGURED', error: 'سرویس سایت در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  },
};
