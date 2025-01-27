const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, path, body, query, headers } = req;

  console.log('\n=== Incoming Request ===');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Method: ${method}`);
  console.log(`Path: ${path}`);
  console.log('Query Parameters:', query);
  console.log('Request Body:', body);
  console.log('Headers:', {
    'content-type': headers['content-type'],
    'authorization': headers['authorization'] ? 'Bearer [TOKEN]' : 'No token'
  });
  console.log('=======================\n');
};
