import app from './app.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`TAgri API ouvindo na porta ${PORT}`);
});
