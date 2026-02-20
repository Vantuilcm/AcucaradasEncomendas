package com.acucaradas.encomendas.service;

import android.app.IntentService;
import android.content.Intent;
import android.content.Context;
import android.os.Bundle;
import android.os.ResultReceiver;

import com.acucaradas.encomendas.database.DatabaseHelper;
import com.acucaradas.encomendas.model.DeletionRequest;
import com.acucaradas.encomendas.util.SessionManager;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Serviço para processar solicitações de exclusão de conta e dados em segundo plano
 */
public class AccountDeletionService extends IntentService {

    private static final String ACTION_COMPLETE_DELETION = "com.acucaradas.encomendas.action.COMPLETE_DELETION";
    private static final String ACTION_PARTIAL_DELETION = "com.acucaradas.encomendas.action.PARTIAL_DELETION";

    private static final String EXTRA_USER_ID = "com.acucaradas.encomendas.extra.USER_ID";
    private static final String EXTRA_REASON = "com.acucaradas.encomendas.extra.REASON";
    private static final String EXTRA_DATA_TYPES = "com.acucaradas.encomendas.extra.DATA_TYPES";
    private static final String EXTRA_RESULT_RECEIVER = "com.acucaradas.encomendas.extra.RESULT_RECEIVER";

    public static final int RESULT_SUCCESS = 1;
    public static final int RESULT_ERROR = 0;

    public AccountDeletionService() {
        super("AccountDeletionService");
    }

    /**
     * Inicia o serviço para executar a exclusão completa da conta
     */
    public static void startCompleteAccountDeletion(Context context, long userId, String reason, ResultReceiver receiver) {
        Intent intent = new Intent(context, AccountDeletionService.class);
        intent.setAction(ACTION_COMPLETE_DELETION);
        intent.putExtra(EXTRA_USER_ID, userId);
        intent.putExtra(EXTRA_REASON, reason);
        intent.putExtra(EXTRA_RESULT_RECEIVER, receiver);
        context.startService(intent);
    }

    /**
     * Inicia o serviço para executar a exclusão parcial de dados
     */
    public static void startPartialDataDeletion(Context context, long userId, String[] dataTypes, String reason, ResultReceiver receiver) {
        Intent intent = new Intent(context, AccountDeletionService.class);
        intent.setAction(ACTION_PARTIAL_DELETION);
        intent.putExtra(EXTRA_USER_ID, userId);
        intent.putExtra(EXTRA_DATA_TYPES, dataTypes);
        intent.putExtra(EXTRA_REASON, reason);
        intent.putExtra(EXTRA_RESULT_RECEIVER, receiver);
        context.startService(intent);
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        if (intent != null) {
            final String action = intent.getAction();
            final ResultReceiver receiver = intent.getParcelableExtra(EXTRA_RESULT_RECEIVER);
            final long userId = intent.getLongExtra(EXTRA_USER_ID, -1);
            final String reason = intent.getStringExtra(EXTRA_REASON);

            if (ACTION_COMPLETE_DELETION.equals(action)) {
                handleCompleteAccountDeletion(userId, reason, receiver);
            } else if (ACTION_PARTIAL_DELETION.equals(action)) {
                String[] dataTypes = intent.getStringArrayExtra(EXTRA_DATA_TYPES);
                handlePartialDataDeletion(userId, dataTypes, reason, receiver);
            }
        }
    }

    /**
     * Processa a solicitação de exclusão completa da conta
     */
    private void handleCompleteAccountDeletion(long userId, String reason, ResultReceiver receiver) {
        DatabaseHelper dbHelper = new DatabaseHelper(this);
        Bundle resultData = new Bundle();

        try {
            // Registra a solicitação no banco de dados
            long requestId = dbHelper.requestCompleteAccountDeletion(userId, reason);

            if (requestId > 0) {
                // Executa a exclusão da conta
                boolean success = dbHelper.executeCompleteAccountDeletion(userId);

                if (success) {
                    // Limpa a sessão do usuário
                    SessionManager sessionManager = new SessionManager(getApplicationContext());
                    sessionManager.logoutUser();

                    // Envia resultado de sucesso
                    resultData.putString("message", "Conta excluída com sucesso");
                    receiver.send(RESULT_SUCCESS, resultData);
                } else {
                    // Envia resultado de erro
                    resultData.putString("error", "Falha ao excluir a conta");
                    receiver.send(RESULT_ERROR, resultData);
                }
            } else {
                // Envia resultado de erro
                resultData.putString("error", "Falha ao registrar solicitação de exclusão");
                receiver.send(RESULT_ERROR, resultData);
            }
        } catch (Exception e) {
            // Envia resultado de erro com a mensagem da exceção
            resultData.putString("error", "Erro: " + e.getMessage());
            receiver.send(RESULT_ERROR, resultData);
        }
    }

    /**
     * Processa a solicitação de exclusão parcial de dados
     */
    private void handlePartialDataDeletion(long userId, String[] dataTypesArray, String reason, ResultReceiver receiver) {
        DatabaseHelper dbHelper = new DatabaseHelper(this);
        Bundle resultData = new Bundle();

        try {
            // Converte o array de tipos de dados para uma string separada por vírgulas
            String dataTypes = String.join(",", dataTypesArray);

            // Registra a solicitação no banco de dados
            long requestId = dbHelper.requestPartialDataDeletion(userId, dataTypes, reason);

            if (requestId > 0) {
                // Executa a exclusão parcial dos dados
                List<String> dataTypesList = Arrays.asList(dataTypesArray);
                boolean success = dbHelper.executePartialDataDeletion(userId, dataTypesList);

                if (success) {
                    // Envia resultado de sucesso
                    resultData.putString("message", "Dados excluídos com sucesso");
                    receiver.send(RESULT_SUCCESS, resultData);
                } else {
                    // Envia resultado de erro
                    resultData.putString("error", "Falha ao excluir os dados");
                    receiver.send(RESULT_ERROR, resultData);
                }
            } else {
                // Envia resultado de erro
                resultData.putString("error", "Falha ao registrar solicitação de exclusão");
                receiver.send(RESULT_ERROR, resultData);
            }
        } catch (Exception e) {
            // Envia resultado de erro com a mensagem da exceção
            resultData.putString("error", "Erro: " + e.getMessage());
            receiver.send(RESULT_ERROR, resultData);
        }
    }
}