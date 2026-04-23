import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined';

type CameraPicture = {
  uri: string;
  base64?: string;
};

export const Camera = forwardRef<any, any>((props, ref) => {
  useImperativeHandle(ref, () => ({
    takePictureAsync: async (): Promise<CameraPicture> => ({
      uri: '',
      base64: '',
    }),
  }));

  return <View {...props} />;
});

Camera.displayName = 'Camera';

(Camera as any).requestCameraPermissionsAsync = async (): Promise<{ status: CameraPermissionStatus }> => ({
  status: 'granted',
});
