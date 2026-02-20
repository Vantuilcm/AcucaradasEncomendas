package com.acucaradas.encomendas;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.acucaradas.encomendas.api.ApiClient;
import com.acucaradas.encomendas.api.ApiService;
import com.acucaradas.encomendas.model.DeletionRequest;
import com.acucaradas.encomendas.utils.SessionManager;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AccountDeletionActivity extends AppCompatActivity {

    private Button btnDeleteAccount;
    private Button btnPartialDeletion;
    private LinearLayout partialDeletionOptions;
    private CheckBox cbDeleteOrders;
    private CheckBox cbDeleteClients;
    private CheckBox cbDeleteMedia;
    private CheckBox cbDeletePreferences;
    private Button btnConfirmPartialDeletion;
    private ApiService apiService;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_account_deletion);

        // Inicializar componentes da UI
        btnDeleteAccount = findViewById(R.id.btn_delete_account);
        btnPartialDeletion = findViewById(R.id.btn_partial_deletion);
        partialDeletionOptions = findViewById(R.id.layout_partial_deletion_options);
        cbDeleteOrders = findViewById(R.id.cb_delete_orders);
        cbDeleteClients = findViewById(R.id.cb_delete_clients);
        cbDeleteMedia = findViewById(R.id.cb_delete_media);
        cbDeletePreferences = findViewById(R.id.cb_delete_preferences);
        btnConfirmPartialDeletion = findViewById(R.id.btn_confirm_partial_deletion);

        // Inicializar API e gerenciador de sessão
        apiService = ApiClient.getClient().create(ApiService.class);
        sessionManager = new SessionManager(this);

        // Configurar listeners
        setupListeners();
    }

    private void setupListeners() {
        // Botão de exclusão completa da conta
        btnDeleteAccount.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showDeleteAccountConfirmationDialog();
            }
        });

        // Botão para mostrar opções de exclusão parcial
        btnPartialDeletion.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (partialDeletionOptions.getVisibility() == View.VISIBLE) {
                    partialDeletionOptions.setVisibility(View.GONE);
                } else {
                    partialDeletionOptions.setVisibility(View.VISIBLE);
                }
            }
        });

        // Botão para confirmar exclusão parcial
        btnConfirmPartialDeletion.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isAnyPartialOptionSelected()) {
                    showPartialDeletionConfirmationDialog();
                } else {
                    Toast.makeText(AccountDeletionActivity.this, 
                            "Selecione pelo menos um tipo de dado para excluir", 
                            Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private boolean isAnyPartialOptionSelected() {
        return cbDeleteOrders.isChecked() || 
               cbDeleteClients.isChecked() || 
               cbDeleteMedia.isChecked() || 
               cbDeletePreferences.isChecked();
    }

    private void showDeleteAccountConfirmationDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Excluir Conta")
                .setMessage("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão removidos permanentemente.")
                .setPositiveButton("Sim, excluir minha conta", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        requestAccountDeletion();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .setIcon(android.R.drawable.ic_dialog_alert)
                .show();
    }

    private void showPartialDeletionConfirmationDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Exclusão Parcial de Dados")
                .setMessage("Tem certeza que deseja excluir os dados selecionados? Esta ação não pode ser desfeita.")
                .setPositiveButton("Sim, excluir dados selecionados", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        requestPartialDeletion();
                    }
                })
                .setNegativeButton("Cancelar", null)
                .setIcon(android.R.drawable.ic_dialog_info)
                .show();
    }

    private void requestAccountDeletion() {
        // Criar objeto de solicitação
        DeletionRequest request = new DeletionRequest();
        request.setUserId(sessionManager.getUserId());
        request.setDeletionType("complete");
        request.setRequestDate(System.currentTimeMillis());

        // Enviar solicitação para a API
        Call<Void> call = apiService.requestAccountDeletion(request);
        call.enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    showSuccessDialog(true);
                    // Fazer logout após confirmação
                    sessionManager.logout();
                } else {
                    Toast.makeText(AccountDeletionActivity.this, 
                            "Erro ao processar solicitação. Tente novamente.", 
                            Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(AccountDeletionActivity.this, 
                        "Falha na conexão. Verifique sua internet e tente novamente.", 
                        Toast.LENGTH_LONG).show();
            }
        });
    }

    private void requestPartialDeletion() {
        // Criar objeto de solicitação
        DeletionRequest request = new DeletionRequest();
        request.setUserId(sessionManager.getUserId());
        request.setDeletionType("partial");
        request.setRequestDate(System.currentTimeMillis());
        
        // Adicionar tipos de dados a serem excluídos
        List<String> dataTypes = new ArrayList<>();
        if (cbDeleteOrders.isChecked()) dataTypes.add("orders");
        if (cbDeleteClients.isChecked()) dataTypes.add("clients");
        if (cbDeleteMedia.isChecked()) dataTypes.add("media");
        if (cbDeletePreferences.isChecked()) dataTypes.add("preferences");
        request.setDataTypes(dataTypes);

        // Enviar solicitação para a API
        Call<Void> call = apiService.requestPartialDeletion(request);
        call.enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    showSuccessDialog(false);
                } else {
                    Toast.makeText(AccountDeletionActivity.this, 
                            "Erro ao processar solicitação. Tente novamente.", 
                            Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(AccountDeletionActivity.this, 
                        "Falha na conexão. Verifique sua internet e tente novamente.", 
                        Toast.LENGTH_LONG).show();
            }
        });
    }

    private void showSuccessDialog(boolean isCompleteDelete) {
        String title = isCompleteDelete ? "Solicitação Enviada" : "Dados Selecionados para Exclusão";
        String message = isCompleteDelete ?
                "Sua solicitação de exclusão de conta foi recebida. Processaremos seu pedido em até 15 dias úteis e enviaremos uma confirmação para seu e-mail." :
                "Sua solicitação de exclusão parcial de dados foi recebida. Processaremos seu pedido em até 15 dias úteis e enviaremos uma confirmação para seu e-mail.";

        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        if (isCompleteDelete) {
                            // Redirecionar para tela de login
                            finish();
                        } else {
                            // Limpar seleções
                            cbDeleteOrders.setChecked(false);
                            cbDeleteClients.setChecked(false);
                            cbDeleteMedia.setChecked(false);
                            cbDeletePreferences.setChecked(false);
                            partialDeletionOptions.setVisibility(View.GONE);
                        }
                    }
                })
                .setCancelable(false)
                .show();
    }
}