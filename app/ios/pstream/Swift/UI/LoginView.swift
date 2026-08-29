import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var store: ZStreamStore

    @State private var username = ""
    @State private var password = ""
    @State private var isBusy = false

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                Spacer()
                Image(systemName: "play.rectangle.fill")
                    .font(.system(size: 56))
                    .foregroundColor(ZStreamTheme.accent)
                Text("ZStream")
                    .font(.largeTitle.bold())

                Spacer()

                TextField("Username", text: $username)
                    .textInputAutocapitalization(.never)
                    .textFieldStyle(.roundedBorder)
                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)

                if let error = store.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    isBusy = true
                    Task {
                        await store.login(username: username, password: password)
                        isBusy = false
                    }
                } label: {
                    if isBusy {
                        ProgressView()
                    } else {
                        Text("Sign In")
                    }
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(isBusy || username.isEmpty || password.isEmpty)

                Spacer()
                Spacer()
            }
            .padding()
            .navigationTitle("Welcome")
        }
    }
}