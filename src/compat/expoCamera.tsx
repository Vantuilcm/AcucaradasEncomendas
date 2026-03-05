import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined';

type CameraPicture = {
  uri: string;
  base64?: string;
};

interface CameraComponent extends React.ForwardRefExoticComponent<any> {
  requestCameraPermissionsAsync?: () => Promise<{ status: CameraPermissionStatus }>;
}

export const Camera: CameraComponent = forwardRef<any, any>((props, ref) => {
  useImperativeHandle(ref, () => ({
    takePictureAsync: async (): Promise<CameraPicture> => ({
      uri: '',
      base64: '',
    }),
  }));

  return <View {...props} />;
});

Camera.displayName = 'Camera';

Camera.requestCameraPermissionsAsync = async (): Promise<{ status: CameraPermissionStatus }> => ({
  status: 'granted',
});
