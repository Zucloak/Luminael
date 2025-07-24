import getYouTubeTitle from 'get-youtube-title';

export const getMediaTitle = async (url: string): Promise<string> => {
  try {
    const id = url.split('v=')[1];
    if (id) {
      const title = await new Promise<string>((resolve, reject) => {
        getYouTubeTitle(id, (err: any, title: string) => {
          if (err) {
            reject(err);
          }
          resolve(title);
        });
      });
      return title;
    }
  } catch (error) {
    console.error('Error fetching YouTube title:', error);
  }
  return url;
};
